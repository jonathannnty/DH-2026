/**
 * Compare — side-by-side session comparison view.
 *
 * Route: /compare?a=<sessionId>&b=<sessionId>
 *
 * Loads both sessions and their recommendations in parallel, then renders
 * a two-column comparison (desktop) / stacked (mobile) layout showing:
 *   - Track badge and session identifier
 *   - Top 3 recommendations with fit scores
 *   - Reasons, concerns, and next steps
 *   - Salary range
 *
 * The comparison is read-only; no mutations are made here.
 */

import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  CircleDollarSign,
  ShieldAlert,
  Sparkles,
  GitCompareArrows,
} from "lucide-react";
import { getSession, getRecommendations } from "@/lib/api";
import { useTrack } from "@/hooks/useTrack";
import { getTrackThemeTokens } from "@/types/uiStateContract";
import { IconLabel } from "@/components/ui/IconLabel";
import { UI_COPY } from "@/lib/copy";
import type { CareerRecommendation, SessionResponse, SponsorTrack } from "@/schemas/career";

// ─── Styles ──────────────────────────────────────────────────────────────────

const wrap: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "32px 20px 64px",
  width: "100%",
};

// Flat grid — each row is a pair of cells (header|header, rec|rec, rec|rec …)
// alignItems: stretch (default) makes both cells in a row grow to the same height.
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 20,
};

// On narrow screens collapse to 1 column — recs stack A then B
const COLLAPSE_STYLE = `@media (max-width: 680px) { .pf-compare-grid { grid-template-columns: 1fr !important; } }`;

// Shared card shell used by both header and rec cards
const card: React.CSSProperties = {
  background: "var(--pf-surface-card-bg)",
  border: "1px solid var(--pf-surface-card-border)",
  borderRadius: "var(--pf-radius-md)",
  overflow: "hidden",
};

const sectionLabel: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 6,
};

const pill: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  background: "var(--pf-color-bg-subtle)",
  borderRadius: "var(--pf-radius-pill)",
  fontSize: "0.78rem",
  color: "var(--pf-color-text-muted)",
  marginRight: 6,
  marginBottom: 6,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TrackChip({ track }: { track: SponsorTrack }) {
  const tokens = getTrackThemeTokens(track.id);
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "3px 10px",
      borderRadius: "var(--pf-radius-pill)",
      fontSize: "0.75rem",
      fontWeight: 600,
      color: tokens.accent,
      border: `1px solid ${tokens.borderTint}`,
      background: tokens.surfaceSoft,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: tokens.accent }} />
      {track.name}
    </span>
  );
}

function FitBadge({ score }: { score: number }) {
  const color =
    score >= 85
      ? "var(--pf-color-success-500)"
      : score >= 70
        ? "var(--pf-color-warning-500)"
        : "var(--pf-color-text-muted)";
  return (
    <span style={{
      padding: "2px 8px",
      borderRadius: "var(--pf-radius-pill)",
      fontSize: "0.75rem",
      fontWeight: 700,
      color,
      border: `1px solid ${color}`,
    }}>
      {UI_COPY.compare.fitScoreLabel(score)}
    </span>
  );
}

interface RecCardProps {
  rec: CareerRecommendation;
  index: number;
  trackColor: string;
}

// Each rec is its own standalone card so CSS grid can stretch paired cards to equal height.
function RecCard({ rec, index, trackColor }: RecCardProps) {
  return (
    <div style={{
      ...card,
      padding: "18px 20px",
      borderLeft: index === 0 ? `3px solid ${trackColor}` : undefined,
    }}>
      {index === 0 && (
        <div style={{
          fontSize: "0.65rem",
          fontWeight: 700,
          color: trackColor,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 4,
        }}>
          {UI_COPY.compare.topMatchLabel}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.3 }}>
          {rec.title}
        </h3>
        <FitBadge score={rec.fitScore} />
      </div>

      <p style={{ fontSize: "0.82rem", color: "var(--pf-color-text-muted)", lineHeight: 1.6, marginBottom: 12 }}>
        {rec.summary}
      </p>

      {rec.salaryRange && (
        <div style={{ marginBottom: 12 }}>
          <IconLabel icon={CircleDollarSign} variant="compact" style={{ fontSize: "0.78rem", color: "var(--pf-color-text-muted)", fontWeight: 600 }}>
            {UI_COPY.compare.salaryLabel} ${rec.salaryRange.low.toLocaleString()} – ${rec.salaryRange.high.toLocaleString()}
          </IconLabel>
        </div>
      )}

      {rec.reasons.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <IconLabel icon={Sparkles} variant="compact" style={{ ...sectionLabel, color: "var(--pf-color-success-500)" }}>
            {UI_COPY.compare.reasonsHeading}
          </IconLabel>
          <div style={{ marginTop: 6 }}>
            {rec.reasons.slice(0, 3).map((r, i) => (
              <div key={i} style={pill}>{r}</div>
            ))}
          </div>
        </div>
      )}

      {rec.concerns.length > 0 && (
        <div>
          <IconLabel icon={ShieldAlert} variant="compact" style={{ ...sectionLabel, color: "var(--pf-color-warning-500)" }}>
            {UI_COPY.compare.concernsHeading}
          </IconLabel>
          <div style={{ marginTop: 6 }}>
            {rec.concerns.slice(0, 2).map((c, i) => (
              <div key={i} style={pill}>{c}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Renders only the session header card — recs are rendered as separate grid children.
interface SessionHeaderProps {
  session: SessionResponse;
  recs: CareerRecommendation[];
  track: SponsorTrack | null;
}

function SessionHeader({ session, recs, track }: SessionHeaderProps) {
  const shortId = session.id.slice(0, 8);
  return (
    <div style={{ ...card, padding: "16px 20px 14px" }}>
      {track && <div style={{ marginBottom: 8 }}><TrackChip track={track} /></div>}
      <div style={{ fontSize: "0.8rem", fontFamily: "var(--pf-font-family-mono)", color: "var(--pf-color-text-muted)" }}>
        {UI_COPY.compare.sessionLabel(shortId)}
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--pf-color-success-500)", marginTop: 2, fontWeight: 600 }}>
        {recs.length} recommendation{recs.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

// ─── Loader state ─────────────────────────────────────────────────────────────

interface LoadedSession {
  session: SessionResponse;
  recs: CareerRecommendation[];
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Compare() {
  const reduceMotion = useReducedMotion();
  const [params] = useSearchParams();
  const aId = params.get("a");
  const bId = params.get("b");

  const [aData, setAData] = useState<LoadedSession | null>(null);
  const [bData, setBData] = useState<LoadedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const trackA = useTrack(aData?.session.trackId);
  const trackB = useTrack(bData?.session.trackId);

  useEffect(() => {
    if (!aId || !bId) {
      setError("Two session IDs are required. Use ?a=<id>&b=<id>");
      setLoading(false);
      return;
    }

    async function loadSession(id: string): Promise<LoadedSession> {
      const [session, recs] = await Promise.all([
        getSession(id),
        getRecommendations(id).catch(() => [] as CareerRecommendation[]),
      ]);
      return { session, recs };
    }

    Promise.all([loadSession(aId), loadSession(bId)])
      .then(([a, b]) => {
        setAData(a);
        setBData(b);
      })
      .catch(() => setError(UI_COPY.error.compareLoad))
      .finally(() => setLoading(false));
  }, [aId, bId]);

  // ── Error ──
  if (error) {
    return (
      <div style={{ ...wrap, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, minHeight: 300, justifyContent: "center", textAlign: "center" }}>
        <p style={{ fontWeight: 600 }}>Could not load comparison</p>
        <p style={{ color: "var(--pf-color-text-muted)", maxWidth: 360, fontSize: "0.9rem" }}>{error}</p>
        <Link to="/dashboard" style={{ color: "var(--pf-color-brand-400)", fontSize: "0.9rem" }}>
          {UI_COPY.compare.backToDashboard}
        </Link>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ ...wrap, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, minHeight: 300, justifyContent: "center" }}>
        <div style={{
          width: 36, height: 36,
          border: "3px solid var(--pf-color-border-subtle)",
          borderTopColor: "var(--pf-color-brand-500)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <span style={{ color: "var(--pf-color-text-muted)", fontSize: "0.9rem" }}>Loading sessions…</span>
      </div>
    );
  }

  // ── Full comparison ──
  return (
    <motion.div
      style={wrap}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.25, ease: "easeOut" }}
    >
      <style>{COLLAPSE_STYLE}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link to="/dashboard" style={{ fontSize: "0.82rem", color: "var(--pf-color-text-muted)", textDecoration: "none" }}>
          {UI_COPY.compare.backToDashboard}
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, marginBottom: 6 }}>
          <IconLabel icon={GitCompareArrows} variant="section" style={{ fontWeight: 700, fontSize: "1.5rem" }}>
            {UI_COPY.compare.heading}
          </IconLabel>
        </div>
        <p style={{ color: "var(--pf-color-text-muted)", fontSize: "0.875rem", maxWidth: 560 }}>
          {UI_COPY.compare.subhead}
        </p>
      </div>

      {/* Flat grid: header row, then one row per rec pair — CSS stretch keeps pairs aligned */}
      {aData && bData && (() => {
        const tokensA = getTrackThemeTokens(trackA?.id ?? "general");
        const tokensB = getTrackThemeTokens(trackB?.id ?? "general");
        const rowCount = Math.max(aData.recs.length, bData.recs.length);

        return (
          <div style={grid} className="pf-compare-grid">
            {/* Row 0: session headers */}
            <SessionHeader session={aData.session} recs={aData.recs} track={trackA ?? null} />
            <SessionHeader session={bData.session} recs={bData.recs} track={trackB ?? null} />

            {/* Rows 1+: paired rec cards — same grid row = same height */}
            {Array.from({ length: rowCount }, (_, i) => (
              <React.Fragment key={i}>
                {aData.recs[i]
                  ? <RecCard rec={aData.recs[i]} index={i} trackColor={tokensA.accent} />
                  : <div />}
                {bData.recs[i]
                  ? <RecCard rec={bData.recs[i]} index={i} trackColor={tokensB.accent} />
                  : <div />}
              </React.Fragment>
            ))}

            {/* No-recs fallback — only shown when a session has zero recs */}
            {aData.recs.length === 0 && (
              <div style={{ ...card, padding: "32px 20px", color: "var(--pf-color-text-muted)", fontSize: "0.85rem", textAlign: "center" }}>
                {UI_COPY.compare.noRecs}
              </div>
            )}
            {bData.recs.length === 0 && (
              <div style={{ ...card, padding: "32px 20px", color: "var(--pf-color-text-muted)", fontSize: "0.85rem", textAlign: "center" }}>
                {UI_COPY.compare.noRecs}
              </div>
            )}
          </div>
        );
      })()}
    </motion.div>
  );
}
