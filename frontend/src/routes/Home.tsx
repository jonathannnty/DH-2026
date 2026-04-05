import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { createSession, getTracks } from "@/lib/api";
import type { SponsorTrack } from "@/schemas/career";
import { motion, useReducedMotion } from "framer-motion";
import {
  canPerformUiAction,
  deriveHomeStateContract,
} from "@/types/uiStateContract";

const container: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "48px 24px",
  textAlign: "center",
};

const heading: React.CSSProperties = {
  fontSize: "3rem",
  fontWeight: 800,
  lineHeight: 1.1,
  marginBottom: 16,
  background:
    "linear-gradient(135deg, var(--pf-color-brand-500), #a78bfa, var(--pf-color-brand-500))",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const sub: React.CSSProperties = {
  fontSize: "1.2rem",
  color: "var(--pf-color-text-muted)",
  maxWidth: 520,
  marginBottom: 40,
};

const btn = (loading: boolean): React.CSSProperties => ({
  padding: "14px 36px",
  fontSize: "1.1rem",
  fontWeight: 600,
  color: loading ? "var(--pf-color-text-muted)" : "var(--pf-btn-primary-text)",
  background: loading
    ? "var(--pf-btn-secondary-bg)"
    : "var(--pf-btn-primary-bg)",
  border: loading ? "1px solid var(--pf-btn-secondary-border)" : "none",
  borderRadius: "var(--pf-radius-md)",
  transition: "background 0.2s",
  cursor: loading ? "not-allowed" : "pointer",
  opacity: loading ? 0.7 : 1,
});

const trackGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 12,
  maxWidth: 900,
  marginBottom: 32,
  width: "100%",
};

const features: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 16,
  maxWidth: 680,
  marginTop: 48,
  width: "100%",
};

const card: React.CSSProperties = {
  background: "var(--pf-surface-card-bg)",
  border: "1px solid var(--pf-surface-card-border)",
  borderRadius: "var(--pf-radius-md)",
  padding: "20px 18px",
  textAlign: "left",
};

export default function Home() {
  const reduceMotion = useReducedMotion();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<SponsorTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>("tech-career");

  useEffect(() => {
    getTracks()
      .then((t) => {
        setTracks(t);
        // Keep tech-career as default if it exists; otherwise pick first
        const hasTech = t.find((tr) => tr.id === "tech-career");
        if (!hasTech && t.length > 0) setSelectedTrack(t[0].id);
      })
      .catch(() => {
        /* tracks unavailable — proceed without a track */
      });
  }, []);

  async function handleStart() {
    const homeState = deriveHomeStateContract({
      loading,
      errorMessage: error,
      selectedTrackId: selectedTrack,
      tracks,
    });

    if (!canPerformUiAction("start-assessment", { home: homeState })) return;

    setLoading(true);
    setError(null);
    try {
      const session = await createSession(selectedTrack);
      nav(`/onboarding?session=${session.id}`);
    } catch {
      setLoading(false);
      setError(
        "Could not start a session. Make sure the API is running and try again.",
      );
    }
  }

  const homeState = deriveHomeStateContract({
    loading,
    errorMessage: error,
    selectedTrackId: selectedTrack,
    tracks,
  });
  const canSelectTrack = canPerformUiAction("select-track", {
    home: homeState,
  });
  const canStartAssessment = canPerformUiAction("start-assessment", {
    home: homeState,
  });

  return (
    <motion.div
      style={container}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.3, ease: "easeOut" }}
    >
      <h1 style={heading}>Find Your Career Path</h1>
      <p style={sub}>
        Tell us about your skills, values, and goals. PathFinder AI matches you
        with careers that actually fit.
      </p>

      {tracks.length > 1 && (
        <>
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--pf-color-text-muted)",
              marginBottom: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Choose a track
          </div>
          <div style={trackGrid}>
            {tracks.map((t) => {
              const selected = selectedTrack === t.id;
              return (
                <motion.div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  initial={
                    reduceMotion ? false : { opacity: 0, y: 10, scale: 0.99 }
                  }
                  animate={
                    reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }
                  }
                  transition={
                    reduceMotion
                      ? undefined
                      : {
                          duration: 0.2,
                          ease: "easeOut",
                          delay: 0.03 * tracks.indexOf(t),
                        }
                  }
                  whileHover={
                    reduceMotion || !canSelectTrack
                      ? undefined
                      : { y: -2, scale: 1.01 }
                  }
                  whileTap={
                    reduceMotion || !canSelectTrack
                      ? undefined
                      : { y: 1, scale: 0.99 }
                  }
                  onClick={() => {
                    if (!canSelectTrack) return;
                    setSelectedTrack(t.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || !canSelectTrack) return;
                    setSelectedTrack(t.id);
                  }}
                  style={{
                    background: "var(--pf-surface-card-bg)",
                    border: `2px solid ${selected ? (t.color ?? "var(--pf-color-brand-500)") : "var(--pf-surface-card-border)"}`,
                    boxShadow: selected
                      ? `0 0 0 1px ${t.color ?? "var(--pf-color-brand-500)"}22`
                      : "none",
                    borderRadius: "var(--pf-radius-md)",
                    padding: "16px 14px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    outline: "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    {t.color && (
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          background: t.color,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                      {t.name}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--pf-color-text-muted)",
                      marginBottom: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {t.description}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--pf-color-text-muted)",
                      opacity: 0.6,
                    }}
                  >
                    Powered by {t.sponsor}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      <button
        style={btn(!canStartAssessment)}
        onClick={handleStart}
        disabled={!canStartAssessment}
      >
        {loading ? "Creating session…" : "Start Assessment"}
      </button>

      {error && (
        <p
          style={{
            marginTop: 12,
            fontSize: "0.875rem",
            color: "var(--pf-color-danger-500)",
            maxWidth: 400,
          }}
        >
          {error}
        </p>
      )}

      <div style={features}>
        <motion.div
          style={card}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={
            reduceMotion ? undefined : { duration: 0.22, delay: 0.08 }
          }
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            12-Dimension Profile
          </div>
          <p
            style={{ color: "var(--pf-color-text-muted)", fontSize: "0.85rem" }}
          >
            Interests, values, skills, risk tolerance, location, and more — all
            in one conversation.
          </p>
        </motion.div>
        <motion.div
          style={card}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={
            reduceMotion ? undefined : { duration: 0.22, delay: 0.12 }
          }
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            AI-Scored Matches
          </div>
          <p
            style={{ color: "var(--pf-color-text-muted)", fontSize: "0.85rem" }}
          >
            Each recommendation includes a fit score, salary range, and ranked
            next steps.
          </p>
        </motion.div>
        <motion.div
          style={card}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={
            reduceMotion ? undefined : { duration: 0.22, delay: 0.16 }
          }
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Track-Specific Insights
          </div>
          <p
            style={{ color: "var(--pf-color-text-muted)", fontSize: "0.85rem" }}
          >
            Sponsor tracks tailor results with industry benchmarks and curated
            resources.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
