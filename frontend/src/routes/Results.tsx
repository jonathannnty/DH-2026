import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getSession, getRecommendations } from '@/lib/api';
import { useSessionStream } from '@/hooks/useSessionStream';
import { useTrack } from '@/hooks/useTrack';
import type { CareerRecommendation, SessionResponse, SponsorTrack } from '@/schemas/career';

// ─── Styles ───────────────────────────────────────────────────────

const wrap: React.CSSProperties = {
  maxWidth: 860,
  margin: '0 auto',
  padding: '32px 20px',
  width: '100%',
};

const centered: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 400,
  gap: 20,
  textAlign: 'center',
};

const progressOuter: React.CSSProperties = {
  width: 320,
  height: 8,
  background: 'var(--bg-input)',
  borderRadius: 4,
  overflow: 'hidden',
};

const recCard: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '28px 24px',
  marginBottom: 20,
};

const badge: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: 20,
  fontSize: '0.8rem',
  fontWeight: 600,
};

const pillList: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 10,
};

const pill: React.CSSProperties = {
  padding: '5px 12px',
  background: 'var(--bg-input)',
  borderRadius: 20,
  fontSize: '0.8rem',
  color: 'var(--text-muted)',
};

// ─── Sub-components ───────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85 ? 'var(--success)' : score >= 70 ? 'var(--warning)' : 'var(--text-muted)';
  return (
    <span style={{ ...badge, color, border: `1px solid ${color}` }}>
      {score}% fit
    </span>
  );
}

function FallbackBanner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 16px',
      background: 'rgba(245, 158, 11, 0.08)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      borderRadius: 'var(--radius)',
      marginBottom: 16,
      fontSize: '0.82rem',
      color: 'var(--warning)',
    }}>
      <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Personalised Fallback Mode
      </span>
      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
        — Live analysis timed out. These recommendations are derived from your profile using our offline engine.
      </span>
    </div>
  );
}

function TrackBanner({ track }: { track: SponsorTrack }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 14px',
      borderRadius: 20,
      fontSize: '0.8rem',
      fontWeight: 600,
      color: track.color ?? 'var(--accent)',
      border: `1px solid ${track.color ?? 'var(--accent)'}`,
      marginBottom: 14,
    }}>
      {track.color && (
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: track.color,
        }} />
      )}
      {track.name} &mdash; {track.sponsor}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

export default function Results() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const nav = useNavigate();

  const [session, setSession] = useState<SessionResponse | null>(null);
  const [recs, setRecs] = useState<CareerRecommendation[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Starting analysis…');
  const [isFallback, setIsFallback] = useState(false);

  const track = useTrack(session?.trackId);
  const shouldStream = session?.status === 'analyzing';
  const stream = useSessionStream(shouldStream ? (sessionId ?? null) : null);

  // Load session
  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId)
      .then(setSession)
      .catch(() => setFetchError('Session not found or unavailable.'));
  }, [sessionId]);

  // React to SSE events
  useEffect(() => {
    if (!stream.latestEvent) return;
    const { type, payload } = stream.latestEvent;

    if (type === 'progress') {
      setProgress((payload as { progress?: number }).progress ?? 0);
      setStage((payload as { stage?: string }).stage ?? 'Processing…');
    }

    if (type === 'complete' && sessionId) {
      if ((payload as { isFallback?: boolean }).isFallback) setIsFallback(true);
      getRecommendations(sessionId).then(setRecs).catch(() => setRecs([]));
      getSession(sessionId).then(setSession).catch(() => {});
    }

    if (type === 'error') {
      setFetchError('Analysis encountered an error. You can retry from the dashboard.');
    }
  }, [stream.latestEvent, sessionId]);

  // SSE closed without delivering recs (connection dropped) — re-fetch session once
  useEffect(() => {
    if (stream.status !== 'closed' && stream.status !== 'error') return;
    if (recs || fetchError || !sessionId) return;
    getSession(sessionId)
      .then((s) => {
        setSession(s);
        if (s.status === 'complete') {
          getRecommendations(sessionId).then(setRecs).catch(() => setRecs([]));
        }
      })
      .catch(() => setFetchError('Lost connection to analysis stream. Please reload.'));
  }, [stream.status, recs, fetchError, sessionId]);

  // If session is already complete on load
  useEffect(() => {
    if (!session) return;

    if (session.status === 'complete' && !recs && sessionId) {
      getRecommendations(sessionId)
        .then(setRecs)
        .catch(() => setRecs([]));
    }

    // Redirect intake sessions back to the chat
    if (session.status === 'intake' && sessionId) {
      nav(`/onboarding?session=${sessionId}`, { replace: true });
    }

    // Surface analysis errors
    if (session.status === 'error') {
      setFetchError('This session encountered an error during analysis. You can start a new assessment or return to the dashboard.');
    }
  }, [session, recs, sessionId, nav]);

  // ── No session ID param ──
  if (!sessionId) {
    return (
      <div style={{ ...wrap, ...centered }}>
        <p style={{ color: 'var(--text-muted)' }}>No session specified.</p>
        <Link to="/" style={{ color: 'var(--accent)', fontWeight: 600 }}>Start a new assessment →</Link>
      </div>
    );
  }

  // ── Fatal fetch/session error ──
  if (fetchError) {
    return (
      <div style={{ ...wrap, ...centered }}>
        <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>Something went wrong</p>
        <p style={{ color: 'var(--text-muted)', maxWidth: 340 }}>{fetchError}</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 22px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Try again
          </button>
          <Link to="/dashboard" style={{
            padding: '10px 22px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text)',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Analyzing / loading state ──
  if (!recs) {
    const accentColor = track?.color ?? 'var(--accent)';
    return (
      <div style={wrap}>
        <div style={centered}>
          <div style={{
            width: 52,
            height: 52,
            border: `3px solid var(--border)`,
            borderTopColor: accentColor,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

          {track && <TrackBanner track={track} />}

          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 6 }}>{stage}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {track && track.id !== 'general'
                ? `Finding your best matches in the ${track.name} track`
                : 'Analyzing your career profile across multiple dimensions'}
            </div>
          </div>

          <div style={progressOuter}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: accentColor,
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{progress}%</div>
        </div>
      </div>
    );
  }

  // ── Empty results ──
  if (recs.length === 0) {
    return (
      <div style={{ ...wrap, ...centered }}>
        <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>No recommendations yet</p>
        <p style={{ color: 'var(--text-muted)', maxWidth: 340 }}>
          The analysis completed but didn't produce recommendations. This can happen when the
          profile is very sparse. Try starting a new session with more detailed answers.
        </p>
        <button
          onClick={() => nav('/')}
          style={{
            padding: '10px 24px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Start new assessment
        </button>
      </div>
    );
  }

  // ── Full results ──
  return (
    <div style={wrap}>
      <div style={{ marginBottom: 32 }}>
        {isFallback && <FallbackBanner />}
        {track && <TrackBanner track={track} />}
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 8 }}>
          {recs.length === 1
            ? 'Your Top Career Match'
            : `Your Top ${recs.length} Career Matches`}
        </h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: 540 }}>
          Each match is scored across 12 profile dimensions. The top result is your strongest fit
          based on skills, values, and goals.
        </p>
      </div>

      {recs.map((rec, i) => (
        <div key={i} style={{
          ...recCard,
          borderLeft: i === 0 ? `3px solid ${track?.color ?? 'var(--accent)'}` : '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
            <div>
              {i === 0 && (
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: track?.color ?? 'var(--accent)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Best match
                </div>
              )}
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{rec.title}</h2>
            </div>
            <ScoreBadge score={rec.fitScore} />
          </div>

          <p style={{ color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.65 }}>
            {rec.summary}
          </p>

          {rec.salaryRange && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: 16,
            }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Salary</span>
              ${rec.salaryRange.low.toLocaleString()} – ${rec.salaryRange.high.toLocaleString()} USD
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 8, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Why it fits
            </div>
            <div style={pillList}>
              {rec.reasons.map((r, j) => <span key={j} style={pill}>{r}</span>)}
            </div>
          </div>

          {rec.concerns.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 8, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Watch out for
              </div>
              <div style={pillList}>
                {rec.concerns.map((c, j) => <span key={j} style={pill}>{c}</span>)}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 8, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Next steps
            </div>
            <ol style={{ paddingLeft: 20, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {rec.nextSteps.map((s, j) => (
                <li key={j} style={{ marginBottom: 5, lineHeight: 1.5 }}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      ))}

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
        marginTop: 32,
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => nav('/')}
          style={{
            padding: '12px 28px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Start new assessment
        </button>
        <Link to="/dashboard" style={{
          padding: '12px 28px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text)',
          fontWeight: 500,
          fontSize: '0.9rem',
        }}>
          View all sessions
        </Link>
      </div>
    </div>
  );
}
