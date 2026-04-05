import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import { createSession, getTracks } from "@/lib/api";
import { HOME_COPY } from "@/lib/copy";
import type { SponsorTrack } from "@/schemas/career";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Compass,
  Cpu,
  Palette,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import {
  canPerformUiAction,
  deriveHomeStateContract,
} from "@/types/uiStateContract";
import { IconLabel, getIconSpec } from "@/components/ui/IconLabel";

const container: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  justifyContent: "flex-start",
  padding: "56px 24px 64px",
  textAlign: "left",
};

const heroSection: React.CSSProperties = {
  position: "relative",
  maxWidth: 1020,
  margin: "0 auto 28px",
  width: "100%",
  border: "1px solid var(--pf-surface-card-border)",
  borderRadius: "calc(var(--pf-radius-md) + 4px)",
  background:
    "linear-gradient(140deg, color-mix(in srgb, var(--pf-color-bg-surface) 94%, var(--pf-color-brand-500) 6%), var(--pf-color-bg-surface))",
  overflow: "hidden",
};

const heroInner: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  padding: "34px 30px 28px",
};

const kicker: React.CSSProperties = {
  fontFamily: "var(--pf-font-family-accent)",
  fontSize: "0.76rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--pf-color-brand-400)",
  marginBottom: 12,
  fontWeight: 700,
};

const heading: React.CSSProperties = {
  fontSize: "clamp(2rem, 5.4vw, 3.75rem)",
  fontWeight: 800,
  lineHeight: 1.02,
  marginBottom: 14,
  maxWidth: "12ch",
};

const sub: React.CSSProperties = {
  fontSize: "1.03rem",
  color: "var(--pf-color-text-muted)",
  maxWidth: 650,
  marginBottom: 20,
  lineHeight: 1.7,
};

const signalGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  width: "100%",
  maxWidth: 760,
  marginBottom: 18,
};

const signalCard: React.CSSProperties = {
  border:
    "1px solid color-mix(in srgb, var(--pf-surface-card-border) 80%, var(--pf-color-brand-500) 20%)",
  background:
    "linear-gradient(130deg, color-mix(in srgb, var(--pf-color-bg-subtle) 92%, var(--pf-color-brand-500) 8%), var(--pf-color-bg-subtle))",
  borderRadius: "var(--pf-radius-sm)",
  padding: "9px 10px",
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
  maxWidth: 1020,
  margin: "0 auto 16px",
  marginBottom: 32,
  width: "100%",
};

const trackPreviewWrap: React.CSSProperties = {
  width: "100%",
  maxWidth: 1020,
  margin: "0 auto 6px",
};

const trackPreviewShell: React.CSSProperties = {
  position: "relative",
  border: "1px solid var(--pf-surface-card-border)",
  borderRadius: "var(--pf-radius-md)",
  background: "var(--pf-surface-card-bg)",
  padding: "16px 18px",
  overflow: "hidden",
  minHeight: 132,
};

const heroRotatorLine: React.CSSProperties = {
  fontFamily: "var(--pf-font-family-accent)",
  fontSize: "0.86rem",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "var(--pf-color-text-muted)",
  marginBottom: 14,
  minHeight: 24,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const features: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 16,
  maxWidth: 1020,
  margin: "26px auto 0",
  width: "100%",
};

const card: React.CSSProperties = {
  background: "var(--pf-surface-card-bg)",
  border: "1px solid var(--pf-surface-card-border)",
  borderRadius: "var(--pf-radius-md)",
  padding: "20px 18px",
  textAlign: "left",
};

const iconWrap: React.CSSProperties = {
  display: "inline-flex",
  width: 20,
  height: 20,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background: "color-mix(in srgb, var(--pf-color-brand-500) 14%, transparent)",
};

const heroSignals = [
  {
    icon: Compass,
    label: HOME_COPY.heroSignals[0].label,
    detail: HOME_COPY.heroSignals[0].detail,
  },
  {
    icon: Sparkles,
    label: HOME_COPY.heroSignals[1].label,
    detail: HOME_COPY.heroSignals[1].detail,
  },
  {
    icon: Briefcase,
    label: HOME_COPY.heroSignals[2].label,
    detail: HOME_COPY.heroSignals[2].detail,
  },
] as const;

const heroRotatorWords = HOME_COPY.hero.rotatorWords;

const ctaIcon = getIconSpec("cta");

interface PreviewMotifConfig {
  right: number;
  bottom: number;
  iconSize: number;
  rotation: number;
  strokeWidth: number;
  opacity: number;
  boxSize: number;
  fill: "none" | "currentColor";
}

function getPreviewMotif(trackId: string): PreviewMotifConfig {
  if (trackId === "tech-career") {
    return {
      right: -24,
      bottom: -20,
      iconSize: 124,
      rotation: -24,
      strokeWidth: 2.45,
      opacity: 0.9,
      boxSize: 102,
      fill: "none",
    };
  }

  if (trackId === "healthcare-pivot") {
    return {
      right: -8,
      bottom: -10,
      iconSize: 108,
      rotation: -14,
      strokeWidth: 2.35,
      opacity: 0.88,
      boxSize: 96,
      fill: "none",
    };
  }

  if (trackId === "creative-industry") {
    return {
      right: -12,
      bottom: -16,
      iconSize: 116,
      rotation: -20,
      strokeWidth: 2.7,
      opacity: 0.92,
      boxSize: 100,
      fill: "none",
    };
  }

  return {
    right: -20,
    bottom: -18,
    iconSize: 114,
    rotation: -20,
    strokeWidth: 2.4,
    opacity: 0.86,
    boxSize: 98,
    fill: "none",
  };
}

const trackCopyById: Record<
  string,
  { cardDescription: string; previewDescription: string }
> = HOME_COPY.track.byId;

function getTrackCopy(track: SponsorTrack) {
  return (
    trackCopyById[track.id] ?? {
      cardDescription: track.description,
      previewDescription: track.description,
    }
  );
}

function getTrackIcon(trackId: string) {
  if (trackId === "tech-career") return Cpu;
  if (trackId === "healthcare-pivot") return Stethoscope;
  if (trackId === "creative-industry") return Palette;
  return Compass;
}

export default function Home() {
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const previousPreviewIndexRef = useRef(0);
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<SponsorTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>("tech-career");
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [heroWordIndex, setHeroWordIndex] = useState(0);
  const [previewDirection, setPreviewDirection] = useState(1);

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

  useEffect(() => {
    if (reduceMotion) {
      setHeroWordIndex(0);
      return;
    }

    let rotateTimeout: number | null = null;
    const rotateInterval = window.setInterval(() => {
      rotateTimeout = window.setTimeout(() => {
        setHeroWordIndex((current) => (current + 1) % heroRotatorWords.length);
      }, 130);
    }, 2600);

    return () => {
      window.clearInterval(rotateInterval);
      if (rotateTimeout !== null) {
        window.clearTimeout(rotateTimeout);
      }
    };
  }, [reduceMotion]);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || reduceMotion) return;

    if (typeof window.matchMedia !== "function") return;

    const desktopMedia = window.matchMedia("(min-width: 1024px)");
    if (!desktopMedia.matches) return;

    let rafId = 0;

    const applyParallax = (x: number, y: number) => {
      hero.style.setProperty("--pf-hero-parallax-x", `${x}px`);
      hero.style.setProperty("--pf-hero-parallax-y", `${y}px`);
    };

    const handlePointerMove = (event: PointerEvent) => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const normalizedX =
          ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const normalizedY =
          ((event.clientY - rect.top) / rect.height - 0.5) * 2;

        applyParallax(
          Math.max(-12, Math.min(12, normalizedX * 12)),
          Math.max(-10, Math.min(10, normalizedY * 10)),
        );
      });
    };

    const resetParallax = () => applyParallax(0, 0);

    resetParallax();
    hero.addEventListener("pointermove", handlePointerMove, { passive: true });
    hero.addEventListener("pointerleave", resetParallax);

    return () => {
      cancelAnimationFrame(rafId);
      hero.removeEventListener("pointermove", handlePointerMove);
      hero.removeEventListener("pointerleave", resetParallax);
      resetParallax();
    };
  }, [reduceMotion]);

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

  const activePreviewTrackId = hoveredTrackId ?? selectedTrack;
  const activePreviewIndex = useMemo(() => {
    const index = tracks.findIndex(
      (track) => track.id === activePreviewTrackId,
    );
    return index >= 0 ? index : 0;
  }, [tracks, activePreviewTrackId]);
  const activePreviewTrack = tracks[activePreviewIndex] ?? null;
  const PreviewTrackIcon = activePreviewTrack
    ? getTrackIcon(activePreviewTrack.id)
    : Compass;
  const previewAccent =
    activePreviewTrack?.color ?? "var(--pf-color-brand-500)";
  const previewMotif = getPreviewMotif(activePreviewTrack?.id ?? "general");

  useEffect(() => {
    const previousIndex = previousPreviewIndexRef.current;
    if (activePreviewIndex !== previousIndex) {
      setPreviewDirection(activePreviewIndex > previousIndex ? 1 : -1);
      previousPreviewIndexRef.current = activePreviewIndex;
    }
  }, [activePreviewIndex]);

  return (
    <motion.div
      style={container}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.3, ease: "easeOut" }}
    >
      <motion.section
        style={heroSection}
        className="home-hero-panel"
        ref={heroRef}
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={
          reduceMotion ? undefined : { duration: 0.36, ease: "easeOut" }
        }
      >
        <div className="home-hero-backdrop" aria-hidden="true">
          <motion.span
            className="home-hero-glow home-hero-glow-a"
            animate={
              reduceMotion
                ? undefined
                : {
                    x: [0, 16, -10, 0],
                    y: [0, -10, 6, 0],
                    scale: [1, 1.06, 0.96, 1],
                  }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 14, repeat: Infinity, ease: "easeInOut" }
            }
          />
          <motion.span
            className="home-hero-glow home-hero-glow-b"
            animate={
              reduceMotion
                ? undefined
                : {
                    x: [0, -14, 9, 0],
                    y: [0, 8, -8, 0],
                    scale: [1, 0.98, 1.08, 1],
                  }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 16, repeat: Infinity, ease: "easeInOut" }
            }
          />
        </div>
        <div style={heroInner} className="home-hero-inner">
          <p style={kicker}>{HOME_COPY.hero.kicker}</p>
          <h1 style={heading} className="home-hero-title-accent">
            {HOME_COPY.hero.heading}
          </h1>
          <div style={heroRotatorLine}>
            <span>{HOME_COPY.hero.rotatorPrefix}</span>
            {reduceMotion ? (
              <span
                style={{ color: "var(--pf-color-brand-400)", fontWeight: 700 }}
              >
                {heroRotatorWords[0]}
              </span>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={heroRotatorWords[heroWordIndex]}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  style={{
                    color: "var(--pf-color-brand-400)",
                    fontWeight: 700,
                  }}
                  aria-live="polite"
                >
                  {heroRotatorWords[heroWordIndex]}
                </motion.span>
              </AnimatePresence>
            )}
          </div>
          <p style={sub}>{HOME_COPY.hero.subhead}</p>

          <div style={signalGrid}>
            {heroSignals.map((signal, index) => (
              <motion.div
                key={signal.label}
                style={signalCard}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 0.22, delay: 0.08 + index * 0.06 }
                }
              >
                <IconLabel
                  icon={signal.icon}
                  variant="compact"
                  style={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    fontSize: "0.72rem",
                    marginBottom: 2,
                  }}
                >
                  {signal.label}
                </IconLabel>
                <div
                  style={{
                    fontSize: "0.79rem",
                    lineHeight: 1.45,
                    color: "var(--pf-color-text-muted)",
                  }}
                >
                  {signal.detail}
                </div>
              </motion.div>
            ))}
          </div>

          <button
            style={{ ...btn(!canStartAssessment), marginTop: 4 }}
            onClick={handleStart}
            disabled={!canStartAssessment}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <IconLabel icon={Activity} variant="cta">
                  Creating session…
                </IconLabel>
              ) : (
                <>
                  <IconLabel icon={Sparkles} variant="cta">
                    Start Assessment
                  </IconLabel>
                  <ArrowRight
                    size={ctaIcon.size}
                    strokeWidth={ctaIcon.strokeWidth}
                    aria-hidden="true"
                  />
                </>
              )}
            </span>
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
        </div>
      </motion.section>

      {tracks.length > 1 && (
        <>
          <div
            style={{
              maxWidth: 1020,
              width: "100%",
              margin: "0 auto 10px",
              fontSize: "0.8rem",
              color: "var(--pf-color-text-muted)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {HOME_COPY.track.chooserHeading}
          </div>
          <div style={trackGrid}>
            {tracks.map((t) => {
              const TrackIcon = getTrackIcon(t.id);
              const trackCopy = getTrackCopy(t);
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
                  onMouseEnter={() => setHoveredTrackId(t.id)}
                  onMouseLeave={() => setHoveredTrackId(null)}
                  onFocus={() => setHoveredTrackId(t.id)}
                  onBlur={() => setHoveredTrackId(null)}
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
                    <IconLabel
                      icon={TrackIcon}
                      variant="compact"
                      style={{ fontWeight: 700, fontSize: "0.9rem" }}
                      iconStyle={{
                        background:
                          "color-mix(in srgb, var(--pf-color-brand-500) 14%, transparent)",
                        borderRadius: "50%",
                        padding: 3,
                        boxSizing: "content-box",
                      }}
                    >
                      {t.name}
                    </IconLabel>
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--pf-color-text-muted)",
                      lineHeight: 1.4,
                    }}
                  >
                    {trackCopy.cardDescription}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {tracks.length > 0 && activePreviewTrack && (
            <div style={trackPreviewWrap}>
              <div
                style={{
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--pf-color-text-muted)",
                  marginBottom: 6,
                  fontWeight: 700,
                }}
              >
                {HOME_COPY.track.previewHeading}
              </div>
              <div style={trackPreviewShell}>
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={activePreviewTrack.id}
                    initial={
                      reduceMotion
                        ? false
                        : { opacity: 0, x: 18 * previewDirection }
                    }
                    animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                    exit={
                      reduceMotion
                        ? undefined
                        : { opacity: 0, x: -18 * previewDirection }
                    }
                    transition={
                      reduceMotion
                        ? undefined
                        : { duration: 0.2, ease: "easeOut" }
                    }
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 14,
                      alignItems: "start",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background:
                              activePreviewTrack.color ??
                              "var(--pf-color-brand-500)",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "0.92rem",
                          }}
                        >
                          {activePreviewTrack.name}{" "}
                          {HOME_COPY.track.previewTitleSuffix}
                        </span>
                      </div>
                      <p
                        style={{
                          color: "var(--pf-color-text-muted)",
                          fontSize: "0.86rem",
                          lineHeight: 1.55,
                          marginBottom: 0,
                        }}
                      >
                        {getTrackCopy(activePreviewTrack).previewDescription}
                      </p>
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--pf-color-brand-500)",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span>
                        {hoveredTrackId
                          ? HOME_COPY.track.previewStatePreviewing
                          : HOME_COPY.track.previewStateSelected}
                      </span>
                      <ArrowUpRight
                        size={13}
                        strokeWidth={1.9}
                        aria-hidden="true"
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence initial={false} mode="wait">
                  <motion.span
                    key={`${activePreviewTrack.id}-${hoveredTrackId ? "hover" : "selected"}`}
                    aria-hidden="true"
                    initial={
                      reduceMotion
                        ? false
                        : {
                            x: 92,
                            y: 18,
                            rotate: previewMotif.rotation + 8,
                            opacity: 0,
                            scale: 0.9,
                          }
                    }
                    animate={
                      reduceMotion
                        ? undefined
                        : {
                            x: 0,
                            y: 0,
                            rotate: previewMotif.rotation,
                            opacity: previewMotif.opacity,
                            scale: 1,
                          }
                    }
                    exit={
                      reduceMotion
                        ? undefined
                        : {
                            x: 56,
                            y: 8,
                            rotate: previewMotif.rotation + 5,
                            opacity: 0,
                            scale: 0.94,
                          }
                    }
                    transition={
                      reduceMotion
                        ? undefined
                        : {
                            duration: 0.44,
                            ease: [0.2, 0.9, 0.25, 1],
                          }
                    }
                    style={{
                      position: "absolute",
                      right: previewMotif.right,
                      bottom: previewMotif.bottom,
                      width: previewMotif.boxSize,
                      height: previewMotif.boxSize,
                      borderRadius: 20,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                      zIndex: 0,
                    }}
                  >
                    <PreviewTrackIcon
                      size={previewMotif.iconSize}
                      strokeWidth={previewMotif.strokeWidth}
                      aria-hidden="true"
                      style={{
                        color: `color-mix(in srgb, ${previewAccent} 86%, #ffffff)`,
                        fill: previewMotif.fill,
                      }}
                    />
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
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
          <IconLabel
            icon={Compass}
            variant="compact"
            style={{ fontWeight: 700, marginBottom: 6 }}
            iconStyle={iconWrap}
          >
            12-Dimension Profile
          </IconLabel>
          <p
            style={{ color: "var(--pf-color-text-muted)", fontSize: "0.85rem" }}
          >
            {HOME_COPY.features.dimensionProfile}
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
          <IconLabel
            icon={Sparkles}
            variant="compact"
            style={{ fontWeight: 700, marginBottom: 6 }}
            iconStyle={iconWrap}
          >
            AI-Scored Matches
          </IconLabel>
          <p
            style={{ color: "var(--pf-color-text-muted)", fontSize: "0.85rem" }}
          >
            {HOME_COPY.features.aiScoredMatches}
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
          <IconLabel
            icon={Briefcase}
            variant="compact"
            style={{ fontWeight: 700, marginBottom: 6 }}
            iconStyle={iconWrap}
          >
            Track-Specific Insights
          </IconLabel>
          <p
            style={{ color: "var(--pf-color-text-muted)", fontSize: "0.85rem" }}
          >
            {HOME_COPY.features.trackInsights}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
