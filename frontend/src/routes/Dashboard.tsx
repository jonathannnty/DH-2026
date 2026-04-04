import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createSession, getTracks } from '@/lib/api';
import type { SponsorTrack } from '@/schemas/career';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface SessionSummary {
  id: string;
  status: string;
  trackId: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

const wrap: React.CSSProperties = {
  maxWidth: 860,
  margin: '0 auto',
  padding: '32px 20px',
  width: '100%',
};

const statusColors: Record<string, string> = {
  intake: 'var(--accent)',
  analyzing: 'var(--warning)',
  complete: 'var(--success)',
  error: 'var(--danger)',
};

const statusLabels: Record<string, string> = {
  intake: 'In progress',
  analyzing: 'Analyzing',
  complete: 'Complete',
  error: 'Error',
};

const actionLabels: Record<string, string> = {
  intake: 'Continue →',
  analyzing: 'View progress →',
  complete: 'See results →',
  error: 'Retry →',
};

const newBtn: React.CSSProperties = {
  padding: '10px 22px',
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius)',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
};

export default function Dashboard() {
  const nav = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [tracks, setTracks] = useState<Map<string, SponsorTrack>>(new Map());
  const [loading, setLoading] = useState(true);
  const [newLoading, setNewLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE_URL}/ops/sessions`)
        .then((r) => r.ok ? r.json() : { sessions: [] })
        .then((d: { sessions: SessionSummary[] }) => d.sessions),
      getTracks().catch(() => [] as SponsorTrack[]),
    ])
      .then(([sessionList, trackList]) => {
        setSessions(sessionList);
        const m = new Map<string, SponsorTrack>();
        for (const t of trackList) m.set(t.id, t);
        setTracks(m);
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleNew() {
    setNewLoading(true);
    try {
      const session = await createSession();
      nav(`/onboarding?session=${session.id}`);
    } catch {
      setNewLoading(false);
    }
  }

  function linkFor(s: SessionSummary) {
    if (s.status === 'complete') return `/results/${s.id}`;
    if (s.status === 'analyzing') return `/results/${s.id}`;
    return `/onboarding?session=${s.id}`;
  }

  function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Sessions</h1>
          {!loading && sessions.length > 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              {' · '}
              {sessions.filter((s) => s.status === 'complete').length} complete
            </p>
          )}
        </div>
        <button style={newBtn} onClick={handleNew} disabled={newLoading}>
          {newLoading ? 'Creating…' : '+ New Assessment'}
        </button>
      </div>

      {loading && (
        <div style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>
          Loading sessions…
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-muted)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius)',
        }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>No sessions yet</p>
          <p style={{ fontSize: '0.875rem', marginBottom: 20 }}>
            Start your first career assessment to see results here.
          </p>
          <button
            onClick={handleNew}
            style={{ ...newBtn, padding: '10px 28px' }}
            disabled={newLoading}
          >
            Start first assessment
          </button>
        </div>
      )}

      {sessions.map((s) => {
        const t = s.trackId ? tracks.get(s.trackId) : null;
        const color = statusColors[s.status] ?? 'var(--text-muted)';

        return (
          <Link key={s.id} to={linkFor(s)} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              marginBottom: 10,
              transition: 'border-color 0.15s',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', fontFamily: 'monospace' }}>
                    {s.id.slice(0, 8)}
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color,
                    border: `1px solid ${color}`,
                  }}>
                    {statusLabels[s.status] ?? s.status}
                  </span>
                  {t && t.id !== 'general' && (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: t.color ?? 'var(--accent)',
                      border: `1px solid ${t.color ?? 'var(--accent)'}`,
                    }}>
                      {t.name}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {s.messageCount} message{s.messageCount !== 1 ? 's' : ''}
                  {' · '}
                  {relativeTime(s.updatedAt)}
                </div>
              </div>

              <span style={{
                fontSize: '0.85rem',
                color: 'var(--accent)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}>
                {actionLabels[s.status] ?? 'Open →'}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
