import { useNavigate } from "react-router-dom";
import { Fragment, useState, useEffect, useMemo, useRef } from "react";
import { createSession, getTracks } from "@/lib/api";
import { HOME_COPY } from "@/lib/copy";
import type { SponsorTrack } from "@/schemas/career";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Brain,
  Compass,
  Cpu,
  Palette,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  canPerformUiAction,
  deriveHomeStateContract,
} from "@/types/uiStateContract";
import { IconLabel } from "@/components/ui/IconLabel";

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
  margin: "0 auto 24px",
  width: "100%",
  border: "1px solid var(--pf-surface-card-border)",
  borderRadius: "calc(var(--pf-radius-md) + 4px)",
  background: "var(--pf-home-hero-bg)",
  overflow: "hidden",
  minHeight: 640,
};

const heroBody: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  padding: "34px 30px 30px",
  display: "flex",
  flexDirection: "column",
  minHeight: 640,
};

const heroTagline: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  borderRadius: "var(--pf-radius-pill)",
  border: "1px solid var(--pf-home-hero-tagline-border)",
  background: "var(--pf-home-hero-tagline-bg)",
  marginBottom: 16,
  width: "fit-content",
};

const heroTaglineText: React.CSSProperties = {
  fontFamily: "var(--pf-font-family-accent)",
  fontSize: "0.72rem",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--pf-home-hero-tagline-text)",
  fontWeight: 700,
};

const heroTitle: React.CSSProperties = {
  fontSize: "clamp(2.1rem, 5.6vw, 4rem)",
  fontWeight: 800,
  lineHeight: 1.04,
  marginBottom: 12,
  maxWidth: "15ch",
  display: "grid",
  gap: 6,
};

const heroSubtitle: React.CSSProperties = {
  fontSize: "1.03rem",
  color: "var(--pf-color-text-muted)",
  maxWidth: 690,
  marginBottom: 18,
  lineHeight: 1.7,
};

const phaseCanvas: React.CSSProperties = {
  position: "relative",
  flex: 1,
  minHeight: 360,
  borderRadius: "var(--pf-radius-md)",
  border: "1px solid var(--pf-home-hero-phase-border)",
  background: "var(--pf-home-hero-phase-bg)",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 18,
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

const heroFooter: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
};

const phaseChip = (active: boolean): React.CSSProperties => ({
  padding: "6px 10px",
  borderRadius: "var(--pf-radius-pill)",
  fontSize: "0.72rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 700,
  color: active ? "#dbe5ff" : "var(--pf-color-text-muted)",
  background: active
    ? "color-mix(in srgb, var(--pf-color-brand-500) 22%, transparent)"
    : "color-mix(in srgb, var(--pf-color-bg-subtle) 84%, transparent)",
  border: active
    ? "1px solid color-mix(in srgb, var(--pf-color-brand-500) 46%, transparent)"
    : "1px solid var(--pf-surface-card-border)",
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

const features: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 20,
  alignItems: "stretch",
  maxWidth: 1020,
  margin: "26px auto 0",
  width: "100%",
};

const card: React.CSSProperties = {
  background: "var(--pf-surface-card-bg)",
  border: "1px solid var(--pf-surface-card-border)",
  borderRadius: "var(--pf-radius-md)",
  padding: 20,
  height: "100%",
  minHeight: 238,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.3fr) minmax(230px, 0.7fr)",
  gap: 24,
  alignItems: "stretch",
  textAlign: "left",
  overflow: "hidden",
  position: "relative",
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

type FeatureMotifKind = "profile" | "ranking" | "route";

type FeatureCardModel = {
  title: string;
  summary: string;
  explanation: string;
  motifLabel: string;
  motifKind: FeatureMotifKind;
  icon: typeof Target;
  accent: string;
};

const featureCards: FeatureCardModel[] = [
  {
    title: HOME_COPY.features.cards.dimensionProfile.title,
    summary: HOME_COPY.features.cards.dimensionProfile.summary,
    explanation: HOME_COPY.features.cards.dimensionProfile.explanation,
    motifLabel: HOME_COPY.features.cards.dimensionProfile.motifLabel,
    motifKind: "profile",
    icon: Target,
    accent: "var(--pf-color-brand-500)",
  },
  {
    title: HOME_COPY.features.cards.aiScoredMatches.title,
    summary: HOME_COPY.features.cards.aiScoredMatches.summary,
    explanation: HOME_COPY.features.cards.aiScoredMatches.explanation,
    motifLabel: HOME_COPY.features.cards.aiScoredMatches.motifLabel,
    motifKind: "ranking",
    icon: Brain,
    accent: "#818cf8",
  },
  {
    title: HOME_COPY.features.cards.trackInsights.title,
    summary: HOME_COPY.features.cards.trackInsights.summary,
    explanation: HOME_COPY.features.cards.trackInsights.explanation,
    motifLabel: HOME_COPY.features.cards.trackInsights.motifLabel,
    motifKind: "route",
    icon: TrendingUp,
    accent: "#34d399",
  },
];

const featureCardCopy: React.CSSProperties = {
  display: "grid",
  gap: 14,
  alignContent: "start",
  minWidth: 0,
};

const featureCardSummary: React.CSSProperties = {
  color: "var(--pf-color-text)",
  fontSize: "0.95rem",
  lineHeight: 1.7,
  marginBottom: 0,
};

const featureCardExplanation: React.CSSProperties = {
  color: "var(--pf-color-text-muted)",
  fontSize: "0.88rem",
  lineHeight: 1.72,
  marginBottom: 0,
};

const featureCardMotif: React.CSSProperties = {
  position: "relative",
  borderRadius: "calc(var(--pf-radius-md) - 2px)",
  border: "1px solid color-mix(in srgb, var(--pf-color-brand-500) 14%, var(--pf-surface-card-border))",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--pf-color-brand-500) 7%, transparent), color-mix(in srgb, var(--pf-color-bg-subtle) 72%, transparent))",
  minHeight: 216,
  overflow: "hidden",
  display: "flex",
  alignItems: "stretch",
  justifyContent: "stretch",
};

const featureCardMotifLabel: React.CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  zIndex: 2,
  padding: "6px 10px",
  borderRadius: "var(--pf-radius-pill)",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--pf-color-text-muted)",
  background: "color-mix(in srgb, var(--pf-color-bg) 82%, transparent)",
  border: "1px solid var(--pf-surface-card-border)",
};

function FeatureMotif({
  kind,
  icon: Icon,
  accent,
  label,
}: {
  kind: FeatureMotifKind;
  icon: typeof Target;
  accent: string;
  label: string;
}) {
  if (kind === "profile") {
    return (
      <div style={featureCardMotif} aria-hidden="true">
        <span style={featureCardMotifLabel}>{label}</span>
        <div
          style={{
            position: "absolute",
            inset: 14,
            borderRadius: "50%",
            border: `1px solid color-mix(in srgb, ${accent} 22%, transparent)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 28,
            borderRadius: "50%",
            border: `1px dashed color-mix(in srgb, ${accent} 24%, transparent)`,
          }}
        />
        {Array.from({ length: 12 }).map((_, index) => {
          const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
          const radius = 66;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <span
              key={index}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 8,
                height: 8,
                borderRadius: "50%",
                transform: `translate(${x}px, ${y}px)`,
                background:
                  index % 3 === 0
                    ? accent
                    : "color-mix(in srgb, var(--pf-color-text-muted) 60%, transparent)",
                boxShadow: `0 0 0 4px color-mix(in srgb, ${accent} 10%, transparent)`,
              }}
            />
          );
        })}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: 114,
              height: 114,
              borderRadius: "50%",
              border: `1px solid color-mix(in srgb, ${accent} 28%, transparent)`,
              background:
                "radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--pf-color-brand-500) 20%, transparent), transparent 62%)",
              display: "grid",
              placeItems: "center",
              boxShadow: "var(--pf-shadow-sm)",
            }}
          >
            <Icon size={38} strokeWidth={2} aria-hidden="true" />
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 16,
              right: 16,
              padding: "8px 10px",
              borderRadius: "var(--pf-radius-md)",
              background: "var(--pf-surface-card-bg)",
              border: "1px solid var(--pf-surface-card-border)",
              color: "var(--pf-color-text-muted)",
              fontSize: "0.76rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            12 signals
          </div>
        </div>
      </div>
    );
  }

  if (kind === "ranking") {
    return (
      <div style={featureCardMotif} aria-hidden="true">
        <span style={featureCardMotifLabel}>{label}</span>
        <div
          style={{
            position: "absolute",
            inset: 16,
            display: "grid",
            gap: 10,
            alignContent: "center",
          }}
        >
          {[94, 89, 82].map((score, index) => (
            <div
              key={score}
              style={{
                display: "grid",
                gap: 6,
                padding: "10px 12px",
                borderRadius: "var(--pf-radius-sm)",
                border: "1px solid var(--pf-surface-card-border)",
                background:
                  index === 0
                    ? "color-mix(in srgb, var(--pf-color-brand-500) 10%, transparent)"
                    : "color-mix(in srgb, var(--pf-color-bg) 82%, transparent)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  fontSize: "0.74rem",
                  color: "var(--pf-color-text-muted)",
                  fontWeight: 700,
                }}
              >
                <span>Fit signal</span>
                <span style={{ color: accent }}>{score}%</span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  overflow: "hidden",
                  background:
                    "color-mix(in srgb, var(--pf-color-bg-subtle) 88%, transparent)",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: `${score}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: accent,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 58,
            height: 58,
            borderRadius: "50%",
            border: `1px solid color-mix(in srgb, ${accent} 24%, transparent)`,
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--pf-color-brand-500) 16%, transparent), transparent 68%)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon size={24} strokeWidth={2.1} aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div style={featureCardMotif} aria-hidden="true">
      <span style={featureCardMotifLabel}>{label}</span>
      <div
        style={{
          position: "absolute",
          inset: 18,
          borderRadius: 22,
          border: `1px solid color-mix(in srgb, ${accent} 18%, transparent)`,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--pf-color-brand-500) 10%, transparent), transparent 55%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          alignContent: "center",
          gap: 12,
          padding: 20,
        }}
      >
        {[
          { label: "Path", value: "Tech" },
          { label: "Track", value: "Healthcare" },
          { label: "Next", value: "Creative" },
        ].map((item, index) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 12px",
              borderRadius: "var(--pf-radius-sm)",
              border: "1px solid var(--pf-surface-card-border)",
              background:
                index === 1
                  ? "color-mix(in srgb, var(--pf-color-brand-500) 10%, transparent)"
                  : "color-mix(in srgb, var(--pf-color-bg) 82%, transparent)",
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--pf-color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            >
              {item.label}
            </span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          right: 16,
          bottom: 16,
          width: 68,
          height: 68,
          borderRadius: "50%",
          border: `1px solid color-mix(in srgb, ${accent} 26%, transparent)`,
          background:
            "radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--pf-color-brand-500) 20%, transparent), transparent 62%)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon size={28} strokeWidth={2.1} aria-hidden="true" />
      </div>
    </div>
  );
}

type HeroPhase = "chaos" | "organizing" | "clarity";

const heroPhaseLabels: Record<HeroPhase, string> = {
  chaos: "Chaos",
  organizing: "Organizing",
  clarity: "Clarity",
};

const heroPhaseSequence: HeroPhase[] = ["chaos", "organizing", "clarity"];

const heroPhaseDurations: Record<HeroPhase, number> = {
  chaos: 2800,
  organizing: 2600,
  clarity: 6200,
};

const heroPhaseCopy: Record<
  HeroPhase,
  { lead: string; title: string; subtitle: string }
> = {
  chaos: {
    lead: "Lost in Career Chaos?",
    title: "Find Your Career Path",
    subtitle: "Too many questions. Too many options. No clear direction.",
  },
  organizing: {
    lead: "Finding Your Path...",
    title: "Find Your Career Path",
    subtitle: "A guided assessment transforms confusion into clarity.",
  },
  clarity: {
    lead: "Clear Career Signals",
    title: "Find Your Career Path",
    subtitle:
      "A guided assessment that transforms your profile into ranked career recommendations with clear reasoning and immediate next steps.",
  },
};

const heroQuestions = [
  "What am I good at?",
  "What pays well?",
  "What gives meaning?",
  "Where do I fit?",
  "What's my timeline?",
  "Can I afford this?",
  "Am I too late?",
  "What if I fail?",
  "Remote or office?",
  "Stable or risky?",
  "What skills matter?",
  "Will I burn out?",
] as const;

const assessmentDimensions = [
  "Interests",
  "Values",
  "Hard Skills",
  "Soft Skills",
  "Risk Tolerance",
  "Financial Needs",
  "Location",
  "Education",
  "Timeline",
  "Purpose",
  "Burnout Risk",
  "Work Style",
] as const;

const clarityCards = [
  {
    title: "Software Engineer",
    score: 94,
    salary: "$120k-$180k",
    color: "#22c55e",
  },
  {
    title: "Data Scientist",
    score: 89,
    salary: "$118k-$172k",
    color: "#818cf8",
  },
  {
    title: "Product Manager",
    score: 82,
    salary: "$112k-$165k",
    color: "#f59e0b",
  },
] as const;

function getNextPhase(current: HeroPhase): HeroPhase {
  if (current === "chaos") return "organizing";
  if (current === "organizing") return "clarity";
  return "chaos";
}

function ChaosVisualization({
  reduceMotion,
  onInteract,
}: {
  reduceMotion: boolean;
  onInteract: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {heroQuestions.map((question, index) => {
        const angle = (index / heroQuestions.length) * Math.PI * 2;
        const radius = 150 + (index % 4) * 24;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const drift = index % 2 === 0 ? 1 : -1;

        return (
          <motion.div
            key={question}
            className="phase-question"
            style={{
              position: "absolute",
              padding: "7px 12px",
              borderRadius: "var(--pf-radius-sm)",
              fontSize: "0.74rem",
              color: "var(--pf-home-hero-question-text)",
              border: "1px solid var(--pf-home-hero-question-border)",
              background: "var(--pf-home-hero-question-bg)",
              backdropFilter: "blur(6px)",
            }}
            initial={{ opacity: 0, scale: 0.88, x: 0, y: 0 }}
            animate={
              reduceMotion
                ? { opacity: 0.72, scale: 1, x, y }
                : {
                    opacity: [0.4, 0.86, 0.45],
                    x: [x, x + 8 * drift, x - 6 * drift, x],
                    y: [y, y - 10 * drift, y + 7 * drift, y],
                    rotate: [0, 4 * drift, -3 * drift, 0],
                  }
            }
            transition={
              reduceMotion
                ? { duration: 0.3, delay: index * 0.03 }
                : {
                    duration: 4.8 + (index % 3) * 0.55,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.05,
                  }
            }
          >
            {question}
          </motion.div>
        );
      })}

      <motion.button
        type="button"
        className="phase-canvas-center"
        onClick={onInteract}
        style={{
          position: "relative",
          zIndex: 2,
          border: "1px solid var(--pf-home-hero-center-border)",
          background: "var(--pf-home-hero-center-bg)",
          color: "var(--pf-home-hero-center-text)",
          borderRadius: "var(--pf-radius-md)",
          padding: "14px 16px",
          minWidth: 234,
          display: "grid",
          gap: 4,
        }}
        animate={
          reduceMotion
            ? undefined
            : {
                boxShadow: [
                  "0 0 0 0 rgba(99, 102, 241, 0.34)",
                  "0 0 0 16px rgba(99, 102, 241, 0)",
                  "0 0 0 0 rgba(99, 102, 241, 0)",
                ],
              }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: 1.9, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <span style={{ fontWeight: 700, fontSize: "0.98rem" }}>
          Too many questions
        </span>
        <span
          style={{
            fontSize: "0.76rem",
            color: "#97a2b8",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          Click to organize
          <ArrowRight size={13} strokeWidth={1.9} aria-hidden="true" />
        </span>
      </motion.button>
    </div>
  );
}

function OrganizingVisualization({ reduceMotion }: { reduceMotion: boolean }) {
  const radius = 162;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {assessmentDimensions.map((dimension, index) => {
        const angle = (index / assessmentDimensions.length) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const angleDeg = (angle * 180) / Math.PI;

        return (
          <Fragment key={dimension}>
            <motion.span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: radius,
                height: 1,
                background:
                  "linear-gradient(90deg, var(--pf-home-hero-dimension-line-start), var(--pf-home-hero-dimension-line-end))",
                transformOrigin: "0% 50%",
                transform: `translateY(-50%) rotate(${angleDeg}deg)`,
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                delay: reduceMotion ? 0 : 0.28 + index * 0.05,
                duration: reduceMotion ? 0.2 : 0.44,
                ease: "easeOut",
              }}
            />
            <motion.div
              key={dimension}
              className="phase-dimension"
              style={{ position: "absolute", left: "50%", top: "50%" }}
              initial={{ opacity: 0, x: -10, y: -10, scale: 0.76 }}
              animate={{ opacity: 1, x, y, scale: 1 }}
              transition={{
                duration: reduceMotion ? 0.2 : 0.64,
                delay: reduceMotion ? 0 : index * 0.06,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              <div
                style={{
                  transform: "translate(-50%, -50%)",
                  padding: "6px 10px",
                  borderRadius: "var(--pf-radius-sm)",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--pf-home-hero-dimension-text)",
                  background: "var(--pf-home-hero-dimension-bg)",
                  border: "1px solid var(--pf-home-hero-dimension-border)",
                  whiteSpace: "nowrap",
                }}
              >
                {dimension}
              </div>
            </motion.div>
          </Fragment>
        );
      })}

      <motion.div
        className="phase-canvas-center"
        style={{
          zIndex: 2,
          minWidth: 176,
          borderRadius: "var(--pf-radius-md)",
          padding: "14px 14px",
          border: "1px solid var(--pf-home-hero-center-border)",
          background: "var(--pf-home-hero-center-bg)",
          color: "var(--pf-home-hero-center-text)",
          textAlign: "center",
        }}
        initial={{ opacity: 0, scale: 0.84 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.34, ease: "easeOut" }}
      >
        <motion.span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "2px solid rgba(129, 140, 248, 0.8)",
            borderTopColor: "transparent",
            display: "inline-block",
            marginBottom: 8,
          }}
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 0.9, repeat: Infinity, ease: "linear" }
          }
        />
        <div
          style={{
            fontSize: "0.74rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Analyzing...
        </div>
      </motion.div>
    </div>
  );
}

function ClarityVisualization({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
        alignContent: "center",
        padding: "18px 16px",
      }}
    >
      {clarityCards.map((career, index) => (
        <motion.article
          key={career.title}
          className="phase-card"
          style={{
            position: "relative",
            borderRadius: "var(--pf-radius-md)",
            border: "1px solid var(--pf-home-hero-card-border)",
            background: "var(--pf-home-hero-card-bg)",
            padding: "14px 14px 12px",
            overflow: "hidden",
            boxShadow: "var(--pf-home-hero-card-shadow)",
          }}
          initial={{ opacity: 0, y: 22, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.48,
            delay: reduceMotion ? 0 : index * 0.12,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          whileHover={reduceMotion ? undefined : { y: -7, scale: 1.02 }}
        >
          <motion.span
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(140deg, ${career.color}22, transparent 65%)`,
              opacity: 0.64,
            }}
            animate={reduceMotion ? undefined : { opacity: [0.4, 0.72, 0.46] }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
            }
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              className="phase-card-title"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
                gap: 8,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  color: "var(--pf-home-hero-card-title)",
                }}
              >
                {career.title}
              </div>
              <span
                className="phase-card-score"
                style={{
                  borderRadius: "var(--pf-radius-pill)",
                  border: `1px solid ${career.color}`,
                  color: career.color,
                  padding: "3px 8px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                }}
              >
                {career.score}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                overflow: "hidden",
                background: "rgba(110, 118, 142, 0.4)",
                marginBottom: 10,
              }}
            >
              <motion.span
                style={{
                  display: "block",
                  height: "100%",
                  borderRadius: 999,
                  background: career.color,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${career.score}%` }}
                transition={{
                  duration: 0.7,
                  delay: 0.22 + index * 0.1,
                  ease: "easeOut",
                }}
              />
            </div>
            <div
              className="phase-card-meta"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.74rem",
                color: "var(--pf-home-hero-card-meta)",
              }}
            >
              <span>Why it fits</span>
              <span style={{ color: "var(--pf-home-hero-card-match)" }}>
                Match
              </span>
            </div>
            <div
              className="phase-card-meta"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.74rem",
                color: "var(--pf-home-hero-card-meta)",
                marginTop: 4,
              }}
            >
              <span>Salary</span>
              <span style={{ color: "var(--pf-home-hero-card-salary)" }}>
                {career.salary}
              </span>
            </div>
            <div
              className="phase-card-salary"
              style={{
                marginTop: 8,
                fontSize: "0.72rem",
                color: career.color,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Rank #{index + 1}
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

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
  const previousPreviewIndexRef = useRef(0);
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<SponsorTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>("tech-career");
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [heroPhase, setHeroPhase] = useState<HeroPhase>("chaos");
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
      setHeroPhase("clarity");
      return;
    }

    const phaseTimer = window.setTimeout(() => {
      setHeroPhase((current) => getNextPhase(current));
    }, heroPhaseDurations[heroPhase]);

    return () => {
      window.clearTimeout(phaseTimer);
    };
  }, [heroPhase, reduceMotion]);

  function handleHeroAdvance() {
    if (reduceMotion) return;
    setHeroPhase((current) => getNextPhase(current));
  }

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
      nav(
        `/onboarding?session=${session.id}&track=${encodeURIComponent(selectedTrack)}`,
      );
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
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={
          reduceMotion ? undefined : { duration: 0.36, ease: "easeOut" }
        }
      >
        <div style={heroBody}>
          <motion.div
            style={heroTagline}
            initial={reduceMotion ? false : { opacity: 0, y: -10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={
              reduceMotion ? undefined : { duration: 0.5, ease: "easeOut" }
            }
          >
            <Sparkles
              size={14}
              strokeWidth={2}
              aria-hidden="true"
              color="#9aa8ff"
            />
            <span style={heroTaglineText}>{HOME_COPY.hero.kicker}</span>
          </motion.div>

          <h1 style={heroTitle}>
            <motion.span
              key={`${heroPhase}-lead`}
              className="home-hero-title-accent"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={
                reduceMotion ? undefined : { duration: 0.35, ease: "easeOut" }
              }
              aria-live="polite"
            >
              {heroPhaseCopy[heroPhase].lead}
            </motion.span>
            <span className="home-hero-title-main">
              {heroPhaseCopy[heroPhase].title}
            </span>
          </h1>

          <motion.p
            key={`${heroPhase}-sub`}
            style={heroSubtitle}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={
              reduceMotion ? undefined : { duration: 0.3, ease: "easeOut" }
            }
          >
            {heroPhaseCopy[heroPhase].subtitle}
          </motion.p>

          <div style={phaseCanvas}>
            <motion.span
              aria-hidden="true"
              style={{
                position: "absolute",
                width: "38vmax",
                height: "38vmax",
                left: "-18vmax",
                top: "-18vmax",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(99, 102, 241, 0.32), rgba(99, 102, 241, 0) 66%)",
                filter: "blur(22px)",
              }}
              animate={
                reduceMotion
                  ? undefined
                  : { x: [0, 22, 0], y: [0, -16, 0], scale: [1, 1.08, 1] }
              }
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 11, repeat: Infinity, ease: "easeInOut" }
              }
            />
            <motion.span
              aria-hidden="true"
              style={{
                position: "absolute",
                width: "34vmax",
                height: "34vmax",
                right: "-14vmax",
                bottom: "-16vmax",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0) 68%)",
                filter: "blur(24px)",
              }}
              animate={
                reduceMotion
                  ? undefined
                  : { x: [0, -18, 0], y: [0, 12, 0], scale: [1, 1.06, 1] }
              }
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 13, repeat: Infinity, ease: "easeInOut" }
              }
            />
            <motion.span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.22,
                backgroundImage:
                  "linear-gradient(rgba(99, 102, 241, 0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.14) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
                maskImage:
                  "radial-gradient(circle at center, rgba(0, 0, 0, 0.58), rgba(0, 0, 0, 0))",
              }}
              animate={
                reduceMotion
                  ? undefined
                  : { backgroundPosition: ["0px 0px", "48px 48px"] }
              }
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 24, repeat: Infinity, ease: "linear" }
              }
            />

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={heroPhase}
                style={{ position: "absolute", inset: 0 }}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
                animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 1.01 }}
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
                }
              >
                {heroPhase === "chaos" && (
                  <ChaosVisualization
                    reduceMotion={Boolean(reduceMotion)}
                    onInteract={handleHeroAdvance}
                  />
                )}
                {heroPhase === "organizing" && (
                  <OrganizingVisualization
                    reduceMotion={Boolean(reduceMotion)}
                  />
                )}
                {heroPhase === "clarity" && (
                  <ClarityVisualization reduceMotion={Boolean(reduceMotion)} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div style={heroFooter}>
            <div
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {heroPhaseSequence.map((phase) => (
                <button
                  key={phase}
                  className="phase-chip"
                  type="button"
                  style={phaseChip(phase === heroPhase)}
                  onClick={() => setHeroPhase(phase)}
                  aria-pressed={phase === heroPhase}
                >
                  {heroPhaseLabels[phase]}
                </button>
              ))}
            </div>

            <motion.button
              type="button"
              className="phase-cta"
              style={{
                ...btn(!canStartAssessment),
                position: "relative",
                overflow: "hidden",
              }}
              onClick={handleStart}
              disabled={!canStartAssessment}
              whileHover={
                reduceMotion || !canStartAssessment
                  ? undefined
                  : { scale: 1.03 }
              }
              whileTap={
                reduceMotion || !canStartAssessment
                  ? undefined
                  : { scale: 0.97 }
              }
            >
              <motion.span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(90deg, #6d74ff, #4ccfff)",
                  opacity: loading ? 0 : 0.72,
                  zIndex: 0,
                }}
                animate={
                  reduceMotion || loading
                    ? undefined
                    : { x: ["-120%", "-18%", "0%", "0%", "120%"] }
                }
                transition={
                  reduceMotion || loading
                    ? undefined
                    : { duration: 7.8, repeat: Infinity, ease: "easeInOut" }
                }
              />
              <span
                style={{
                  position: "relative",
                  zIndex: 1,
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
                    <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                  </>
                )}
              </span>
            </motion.button>
          </div>

          {error && (
            <p
              style={{
                marginTop: 12,
                fontSize: "0.875rem",
                color: "var(--pf-color-danger-500)",
                maxWidth: 420,
              }}
            >
              {error}
            </p>
          )}

          <motion.div
            className="home-hero-scroll-hint"
            style={{
              marginTop: 18,
              textAlign: "center",
              fontSize: "0.74rem",
              color: "var(--pf-color-text-muted)",
              letterSpacing: "0.04em",
            }}
            animate={reduceMotion ? undefined : { y: [0, 5, 0] }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 2.1, repeat: Infinity, ease: "easeInOut" }
            }
          >
            Scroll to explore tracks
          </motion.div>
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
        {featureCards.map((feature, index) => (
          <motion.article
            key={feature.title}
            style={card}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={
              reduceMotion ? undefined : { duration: 0.22, delay: 0.08 + index * 0.04 }
            }
          >
            <div style={featureCardCopy}>
              <IconLabel
                icon={feature.icon}
                variant="compact"
                style={{ fontWeight: 700, marginBottom: 2 }}
                iconStyle={iconWrap}
              >
                {feature.title}
              </IconLabel>
              <p style={featureCardSummary}>{feature.summary}</p>
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  padding: "14px 14px 12px",
                  borderRadius: "var(--pf-radius-sm)",
                  border: "1px solid var(--pf-surface-card-border)",
                  background:
                    "color-mix(in srgb, var(--pf-color-bg-subtle) 84%, transparent)",
                }}
              >
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--pf-color-brand-500)",
                  }}
                >
                  How the app achieves it
                </span>
                <p style={featureCardExplanation}>{feature.explanation}</p>
              </div>
            </div>

            <FeatureMotif
              kind={feature.motifKind}
              icon={feature.icon}
              accent={feature.accent}
              label={feature.motifLabel}
            />
          </motion.article>
        ))}
      </div>
    </motion.div>
  );
}
