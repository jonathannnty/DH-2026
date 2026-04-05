import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { getSession, getRecommendations } from "@/lib/api";
import { useSessionStream } from "@/hooks/useSessionStream";
import { useTrack } from "@/hooks/useTrack";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CircleDollarSign,
  Compass,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type {
  CareerRecommendation,
  SessionResponse,
  SponsorTrack,
} from "@/schemas/career";
import {
  canPerformUiAction,
  deriveResultsStateContract,
} from "@/types/uiStateContract";
import { IconLabel } from "@/components/ui/IconLabel";
import { UI_COPY } from "@/lib/copy";

// ─── Styles ───────────────────────────────────────────────────────

const wrap: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto",
  padding: "32px 20px",
  width: "100%",
};

const centered: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 400,
  gap: 20,
  textAlign: "center",
};

const progressOuter: React.CSSProperties = {
  width: 320,
  height: 8,
  background: "var(--pf-color-bg-subtle)",
  borderRadius: 4,
  overflow: "hidden",
};

const recCard: React.CSSProperties = {
  background: "var(--pf-surface-card-bg)",
  border: "1px solid var(--pf-surface-card-border)",
  borderRadius: "var(--pf-radius-md)",
  padding: "28px 24px",
  marginBottom: 20,
};

const badge: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: 20,
  fontSize: "0.8rem",
  fontWeight: 600,
};

const pillList: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 10,
};

const pill: React.CSSProperties = {
  padding: "5px 12px",
  background: "var(--pf-color-bg-subtle)",
  borderRadius: 20,
  fontSize: "0.8rem",
  color: "var(--pf-color-text-muted)",
};

// ─── Sub-components ───────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85
      ? "var(--pf-color-success-500)"
      : score >= 70
        ? "var(--pf-color-warning-500)"
        : "var(--pf-color-text-muted)";
  return (
    <span style={{ ...badge, color, border: `1px solid ${color}` }}>
      {score}% fit
    </span>
  );
}

function FallbackBanner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        background: "color-mix(in srgb, var(--pf-color-warning-500) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--pf-color-warning-500) 30%, transparent)",
        borderRadius: "var(--pf-radius-md)",
        marginBottom: 16,
        fontSize: "0.82rem",
        color: "var(--pf-color-warning-500)",
      }}
    >
      <span
        style={{
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {UI_COPY.fallback.modeBadge}
      </span>
      <span style={{ color: "var(--pf-color-text-muted)", fontWeight: 400 }}>
        — {UI_COPY.fallback.modeDescription}
      </span>
    </div>
  );
}

function TrackBanner({ track }: { track: SponsorTrack }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        borderRadius: 20,
        fontSize: "0.8rem",
        fontWeight: 600,
        color: track.color ?? "var(--pf-color-brand-500)",
        border: `1px solid ${track.color ?? "var(--pf-color-brand-500)"}`,
        marginBottom: 14,
      }}
    >
      {track.color && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: track.color,
          }}
        />
      )}
      {track.name} &mdash; {track.sponsor}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

export default function Results() {
  const reduceMotion = useReducedMotion();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();

  const [session, setSession] = useState<SessionResponse | null>(null);
  const [recs, setRecs] = useState<CareerRecommendation[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Starting analysis…");
  const [isFallback, setIsFallback] = useState(false);

  const track = useTrack(session?.trackId);
  const shouldStream = session?.status === "analyzing";
  const stream = useSessionStream(shouldStream ? (sessionId ?? null) : null);

  const resultsState = deriveResultsStateContract({
    hasSessionParam: Boolean(sessionId),
    hasSession: Boolean(session),
    sessionStatus: session?.status ?? null,
    hasRecommendations: Boolean(recs),
    recommendationCount: recs?.length ?? 0,
    fetchError,
    isFallback,
    progressPct: progress,
    stageLabel: stage,
  });
  const canRetryAnalysis = canPerformUiAction("retry-analysis", {
    results: resultsState,
  });

  // Load session
  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId)
      .then(setSession)
      .catch(() => setFetchError("Session not found or unavailable."));
  }, [sessionId]);

  // React to SSE events
  useEffect(() => {
    if (!stream.latestEvent) return;
    const { type, payload } = stream.latestEvent;

    if (type === "progress") {
      setProgress((payload as { progress?: number }).progress ?? 0);
      setStage((payload as { stage?: string }).stage ?? "Processing…");
    }

    if (type === "complete" && sessionId) {
      if ((payload as { isFallback?: boolean }).isFallback) setIsFallback(true);

      // Fetch session first so status is updated before recommendations are fetched.
      // Then retry recommendations once with a 1.5s delay if the first attempt fails —
      // guards against any residual timing skew between the SSE emit and DB visibility.
      getSession(sessionId)
        .then(setSession)
        .catch(() => {});

      getRecommendations(sessionId)
        .then(setRecs)
        .catch(() =>
          new Promise<void>((res) => setTimeout(res, 1500))
            .then(() => getRecommendations(sessionId))
            .then(setRecs)
            .catch(() => setRecs([])),
        );
    }

    if (type === "error") {
      setFetchError(
        "Analysis encountered an error. You can retry from the dashboard.",
      );
    }
  }, [stream.latestEvent, sessionId]);

  // SSE closed without delivering recs (connection dropped) — re-fetch session once
  useEffect(() => {
    if (stream.status !== "closed" && stream.status !== "error") return;
    if (recs || fetchError || !sessionId) return;
    getSession(sessionId)
      .then((s) => {
        setSession(s);
        if (s.status === "complete") {
          getRecommendations(sessionId)
            .then(setRecs)
            .catch(() => setRecs([]));
        }
      })
      .catch(() =>
        setFetchError("Lost connection to analysis stream. Please reload."),
      );
  }, [stream.status, recs, fetchError, sessionId]);

  // If session is already complete on load
  useEffect(() => {
    if (!session) return;

    if (session.status === "complete" && !recs && sessionId) {
      getRecommendations(sessionId)
        .then(setRecs)
        .catch(() => setRecs([]));
    }

    // Redirect intake sessions back to the chat
    if (session.status === "intake" && sessionId) {
      const finalTrack = session.trackId ?? searchParams.get("track");
      nav(
        finalTrack
          ? `/onboarding?session=${sessionId}&track=${encodeURIComponent(finalTrack)}`
          : `/onboarding?session=${sessionId}`,
        { replace: true },
      );
    }

    // Surface analysis errors
    if (session.status === "error") {
      setFetchError(
        "This session encountered an error during analysis. You can start a new assessment or return to the dashboard.",
      );
    }
  }, [session, recs, sessionId, nav, searchParams]);

  // ── No session ID param ──
  if (resultsState.viewState === "no-session") {
    return (
      <div style={{ ...wrap, ...centered }}>
        <p style={{ color: "var(--pf-color-text-muted)" }}>
          No session specified.
        </p>
        <Link
          to="/"
          style={{ color: "var(--pf-color-brand-500)", fontWeight: 600 }}
        >
          Start a new assessment →
        </Link>
      </div>
    );
  }

  // ── Fatal fetch/session error ──
  if (resultsState.viewState === "error") {
    return (
      <div style={{ ...wrap, ...centered }}>
        <p style={{ fontWeight: 600, fontSize: "1.1rem" }}>
          Something went wrong
        </p>
        <p style={{ color: "var(--pf-color-text-muted)", maxWidth: 340 }}>
          {fetchError}
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 22px",
              background: "var(--pf-btn-primary-bg)",
              color: "var(--pf-btn-primary-text)",
              border: "none",
              borderRadius: "var(--pf-radius-md)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
            disabled={!canRetryAnalysis}
          >
            Try again
          </button>
          <Link
            to="/dashboard"
            style={{
              padding: "10px 22px",
              background: "var(--pf-btn-secondary-bg)",
              border: "1px solid var(--pf-btn-secondary-border)",
              borderRadius: "var(--pf-radius-md)",
              color: "var(--pf-btn-secondary-text)",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Analyzing / loading state ──
  if (
    resultsState.viewState === "loading-session" ||
    resultsState.viewState === "analyzing"
  ) {
    const accentColor = track?.color ?? "var(--pf-color-brand-500)";
    return (
      <div style={wrap}>
        <div style={centered}>
          <div
            style={{
              width: 52,
              height: 52,
              border: `3px solid var(--pf-surface-card-border)`,
              borderTopColor: accentColor,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

          {track && <TrackBanner track={track} />}

          <div>
            <div
              style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 6 }}
            >
              {resultsState.stageLabel}
            </div>
            <div
              style={{
                color: "var(--pf-color-text-muted)",
                fontSize: "0.875rem",
              }}
            >
              {track && track.id !== "general"
                ? `Finding your best matches in the ${track.name} track`
                : "Analyzing your career profile across multiple dimensions"}
            </div>
          </div>

          <div style={progressOuter}>
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: accentColor,
                borderRadius: 4,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <div
            style={{ color: "var(--pf-color-text-muted)", fontSize: "0.8rem" }}
          >
            {resultsState.progressPct}%
          </div>
        </div>
      </div>
    );
  }

  // ── Empty results ──
  if (resultsState.viewState === "empty") {
    return (
      <div style={{ ...wrap, ...centered }}>
        <p style={{ fontWeight: 600, fontSize: "1.1rem" }}>
          No recommendations yet
        </p>
        <p style={{ color: "var(--pf-color-text-muted)", maxWidth: 340 }}>
          The analysis completed but didn't produce recommendations. This can
          happen when the profile is very sparse. Try starting a new session
          with more detailed answers.
        </p>
        <button
          onClick={() => nav("/")}
          style={{
            padding: "10px 24px",
            background: "var(--pf-btn-primary-bg)",
            color: "var(--pf-btn-primary-text)",
            border: "none",
            borderRadius: "var(--pf-radius-md)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Start new assessment
        </button>
      </div>
    );
  }

  const resolvedRecs = recs ?? [];

  // ── Full results ──
  return (
    <motion.div
      style={wrap}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.3, ease: "easeOut" }}
    >
      <div style={{ marginBottom: 32 }}>
        {isFallback && <FallbackBanner />}
        {track && <TrackBanner track={track} />}
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 8 }}>
          {resultsState.recommendationCount === 1
            ? "Your Top Career Match"
            : `Your Top ${resultsState.recommendationCount} Career Matches`}
        </h1>
        <p style={{ color: "var(--pf-color-text-muted)", maxWidth: 540 }}>
          Each match is scored across 12 profile dimensions. The top result is
          your strongest fit based on skills, values, and goals.
        </p>
      </div>

      {resolvedRecs.map((rec, i) => (
        <motion.div
          key={i}
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 0.22, ease: "easeOut", delay: 0.05 * i }
          }
          whileHover={
            reduceMotion ? undefined : { y: -2, transition: { duration: 0.12 } }
          }
          whileTap={
            reduceMotion
              ? undefined
              : { y: 1, scale: 0.998, transition: { duration: 0.08 } }
          }
          style={{
            ...recCard,
            borderLeft:
              i === 0
                ? `3px solid ${track?.color ?? "var(--pf-color-brand-500)"}`
                : "1px solid var(--pf-color-border-subtle)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
              gap: 12,
            }}
          >
            <div>
              {i === 0 && (
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: track?.color ?? "var(--pf-color-brand-500)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Best match
                </div>
              )}
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                {rec.title}
              </h2>
            </div>
            <ScoreBadge score={rec.fitScore} />
          </div>

          <p
            style={{
              color: "var(--pf-color-text-muted)",
              marginBottom: 16,
              lineHeight: 1.65,
            }}
          >
            {rec.summary}
          </p>

          {rec.salaryRange && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                background: "var(--pf-color-bg-subtle)",
                borderRadius: "var(--pf-radius-sm)",
                fontSize: "0.875rem",
                fontWeight: 600,
                marginBottom: 16,
              }}
            >
              <IconLabel
                icon={CircleDollarSign}
                variant="section"
                style={{ color: "var(--pf-color-text-muted)", fontWeight: 400 }}
              >
                Salary
              </IconLabel>
              ${rec.salaryRange.low.toLocaleString()} – $
              {rec.salaryRange.high.toLocaleString()} USD
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <IconLabel
              icon={Sparkles}
              variant="section"
              style={{
                fontWeight: 600,
                fontSize: "0.8rem",
                marginBottom: 8,
                color: "var(--pf-color-success-500)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Why it fits
            </IconLabel>
            <div style={pillList}>
              {rec.reasons.map((r, j) => (
                <span key={j} style={pill}>
                  {r}
                </span>
              ))}
            </div>
          </div>

          {rec.concerns.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <IconLabel
                icon={ShieldAlert}
                variant="section"
                style={{
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  marginBottom: 8,
                  color: "var(--pf-color-warning-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Watch out for
              </IconLabel>
              <div style={pillList}>
                {rec.concerns.map((c, j) => (
                  <span key={j} style={pill}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <IconLabel
              icon={Compass}
              variant="section"
              style={{
                fontWeight: 600,
                fontSize: "0.8rem",
                marginBottom: 8,
                color: "var(--pf-color-brand-500)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Next steps
            </IconLabel>
            <ol
              style={{
                paddingLeft: 20,
                color: "var(--pf-color-text-muted)",
                fontSize: "0.875rem",
              }}
            >
              {rec.nextSteps.map((s, j) => (
                <li key={j} style={{ marginBottom: 5, lineHeight: 1.5 }}>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </motion.div>
      ))}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          marginTop: 32,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => nav("/")}
          style={{
            padding: "12px 28px",
            background: "var(--pf-btn-primary-bg)",
            color: "var(--pf-btn-primary-text)",
            border: "none",
            borderRadius: "var(--pf-radius-md)",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "0.9rem",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <IconLabel icon={ArrowRight} variant="cta">
            Start new assessment
          </IconLabel>
        </button>
        <Link
          to="/dashboard"
          style={{
            padding: "12px 28px",
            background: "var(--pf-btn-secondary-bg)",
            border: "1px solid var(--pf-btn-secondary-border)",
            borderRadius: "var(--pf-radius-md)",
            color: "var(--pf-btn-secondary-text)",
            fontWeight: 500,
            fontSize: "0.9rem",
          }}
        >
          View all sessions
        </Link>
      </div>
    </motion.div>
  );
}
