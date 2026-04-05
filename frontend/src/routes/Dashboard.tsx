import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createSession, getTracks } from "@/lib/api";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  GitCompareArrows,
  LoaderCircle,
  PencilLine,
  X,
} from "lucide-react";
import type { SessionStatus, SponsorTrack } from "@/schemas/career";
import {
  canPerformUiAction,
  deriveDashboardStateContract,
  getSessionDestination,
  getSessionStatusDisplay,
} from "@/types/uiStateContract";
import { IconLabel } from "@/components/ui/IconLabel";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

interface SessionSummary {
  id: string;
  status: SessionStatus;
  trackId: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

const wrap: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto",
  padding: "32px 20px",
  width: "100%",
};

const newBtn: React.CSSProperties = {
  padding: "10px 22px",
  background: "var(--pf-btn-primary-bg)",
  color: "var(--pf-btn-primary-text)",
  border: "none",
  borderRadius: "var(--pf-radius-md)",
  fontWeight: 600,
  fontSize: "0.9rem",
  cursor: "pointer",
};

function getSessionActionIcon(status: SessionStatus) {
  if (status === "intake") return PencilLine;
  if (status === "analyzing") return LoaderCircle;
  if (status === "error") return AlertTriangle;
  return ArrowUpRight;
}

function withTrackQuery(target: string, trackId: string | null): string {
  if (!trackId) return target;
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}track=${encodeURIComponent(trackId)}`;
}

export default function Dashboard() {
  const reduceMotion = useReducedMotion();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [tracks, setTracks] = useState<Map<string, SponsorTrack>>(new Map());
  const [loading, setLoading] = useState(true);
  const [newLoading, setNewLoading] = useState(false);
  // Compare mode: holds the first session ID the user picked for comparison
  const [compareAId, setCompareAId] = useState<string | null>(
    searchParams.get("compare") ?? null,
  );

  const dashboardSessions = sessions.map((s) => ({
    id: s.id,
    status: s.status,
    trackId: s.trackId,
    messageCount: s.messageCount,
    updatedAtIso: s.updatedAt,
  }));

  useEffect(() => {
    Promise.all([
      fetch(`${BASE_URL}/ops/sessions`)
        .then((r) => (r.ok ? r.json() : { sessions: [] }))
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
    const dashboardState = deriveDashboardStateContract({
      loading,
      sessions: dashboardSessions,
      creatingNew: newLoading,
    });

    if (
      !canPerformUiAction("create-new-session", { dashboard: dashboardState })
    )
      return;

    setNewLoading(true);
    try {
      const session = await createSession();
      nav(`/onboarding?session=${session.id}&track=general`);
    } catch {
      setNewLoading(false);
    }
  }

  function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const dashboardState = deriveDashboardStateContract({
    loading,
    sessions: dashboardSessions,
    creatingNew: newLoading,
  });
  const canCreateNewSession = canPerformUiAction("create-new-session", {
    dashboard: dashboardState,
  });
  const canOpenSession = canPerformUiAction("open-session", {
    dashboard: dashboardState,
  });

  return (
    <motion.div
      style={wrap}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={
        reduceMotion ? undefined : { duration: 0.28, ease: "easeOut" }
      }
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Sessions</h1>
          {!loading && sessions.length > 0 && (
            <p
              style={{
                color: "var(--pf-color-text-muted)",
                fontSize: "0.85rem",
                marginTop: 2,
              }}
            >
              {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              {" · "}
              {sessions.filter((s) => s.status === "complete").length} complete
            </p>
          )}
        </div>
        <button
          style={{ ...newBtn, opacity: canCreateNewSession ? 1 : 0.7 }}
          onClick={handleNew}
          disabled={!canCreateNewSession}
        >
          {newLoading ? "Creating…" : "+ New Assessment"}
        </button>
      </div>

      {/* Compare mode banner */}
      {compareAId && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 16px",
            marginBottom: 16,
            background:
              "color-mix(in srgb, var(--pf-color-brand-500) 8%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--pf-color-brand-500) 25%, transparent)",
            borderRadius: "var(--pf-radius-md)",
            fontSize: "0.85rem",
          }}
        >
          <IconLabel
            icon={GitCompareArrows}
            variant="compact"
            style={{ color: "var(--pf-color-brand-400)", fontWeight: 600 }}
          >
            Select a second completed session to compare
          </IconLabel>
          <button
            onClick={() => setCompareAId(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--pf-color-text-muted)",
              display: "flex",
              alignItems: "center",
              padding: 4,
            }}
            aria-label="Cancel comparison"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      {dashboardState.loadState === "loading" && (
        <div
          style={{
            color: "var(--pf-color-text-muted)",
            padding: "40px 0",
            textAlign: "center",
          }}
        >
          Loading sessions…
        </div>
      )}

      {dashboardState.loadState === "ready" && sessions.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--pf-color-text-muted)",
            border: "1px dashed var(--pf-surface-card-border)",
            borderRadius: "var(--pf-radius-md)",
          }}
        >
          <p style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8 }}>
            No sessions yet
          </p>
          <p style={{ fontSize: "0.875rem", marginBottom: 20 }}>
            Start your first career assessment to see results here.
          </p>
          <button
            onClick={handleNew}
            style={{ ...newBtn, padding: "10px 28px" }}
            disabled={!canCreateNewSession}
          >
            Start first assessment
          </button>
        </div>
      )}

      {sessions.map((s) => {
        const t = s.trackId ? tracks.get(s.trackId) : null;
        const statusDisplay = getSessionStatusDisplay(s.status);
        const color = statusDisplay.color;
        const ActionIcon = getSessionActionIcon(s.status);

        const baseLinkTarget = canOpenSession
          ? getSessionDestination(s.id, s.status)
          : "/dashboard";
        const linkTarget = withTrackQuery(baseLinkTarget, s.trackId);

        const isSelected = compareAId === s.id;
        const canBeComparedWith =
          compareAId !== null && compareAId !== s.id && s.status === "complete";
        const canStartCompare = compareAId === null && s.status === "complete";

        return (
          <motion.div
            key={s.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: 0.18,
                    ease: "easeOut",
                    delay: 0.03 * sessions.indexOf(s),
                  }
            }
            whileHover={reduceMotion ? undefined : { y: -2, scale: 1.004 }}
            whileTap={reduceMotion ? undefined : { y: 1, scale: 0.998 }}
            onClick={() => canOpenSession && nav(linkTarget)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              background: "var(--pf-surface-card-bg)",
              border: isSelected
                ? "1px solid var(--pf-color-brand-400)"
                : "1px solid var(--pf-surface-card-border)",
              borderRadius: "var(--pf-radius-md)",
              marginBottom: 10,
              transition: "border-color 0.15s, box-shadow 0.15s",
              cursor: canOpenSession ? "pointer" : "default",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    fontFamily: "var(--pf-font-family-mono)",
                  }}
                >
                  {s.id.slice(0, 8)}
                </span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color,
                    border: `1px solid ${color}`,
                  }}
                >
                  {statusDisplay.label}
                </span>
                {t && t.id !== "general" && (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 10,
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: t.color ?? "var(--pf-color-brand-500)",
                      border: `1px solid ${t.color ?? "var(--pf-color-brand-500)"}`,
                    }}
                  >
                    {t.name}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--pf-color-text-muted)",
                }}
              >
                {s.messageCount} message{s.messageCount !== 1 ? "s" : ""}
                {" · "}
                {relativeTime(s.updatedAt)}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isSelected && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "var(--pf-color-brand-400)",
                    padding: "3px 10px",
                    border: "1px solid var(--pf-color-brand-400)",
                    borderRadius: "var(--pf-radius-pill)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Selected
                </span>
              )}
              {canBeComparedWith && (
                <Link
                  to={`/compare?a=${compareAId}&b=${s.id}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "var(--pf-color-brand-400)",
                    padding: "3px 10px",
                    border: "1px solid var(--pf-color-brand-400)",
                    borderRadius: "var(--pf-radius-pill)",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  <IconLabel icon={GitCompareArrows} variant="compact">
                    Compare with this
                  </IconLabel>
                </Link>
              )}
              {canStartCompare && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCompareAId(s.id);
                  }}
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "var(--pf-color-text-muted)",
                    padding: "3px 10px",
                    border: "1px solid var(--pf-surface-card-border)",
                    borderRadius: "var(--pf-radius-pill)",
                    background: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Compare
                </button>
              )}
              <IconLabel
                icon={ActionIcon}
                variant="action"
                style={{
                  fontSize: "0.85rem",
                  color: "var(--pf-color-brand-500)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {statusDisplay.actionLabel}
              </IconLabel>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
