import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { getSession, sendMessage, triggerAnalysis } from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { ChatMessage, CareerProfile } from "@/schemas/career";
import { useTrack } from "@/hooks/useTrack";

// ─── Styles ───────────────────────────────────────────────────────

const wrap: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  maxWidth: 720,
  margin: "0 auto",
  width: "100%",
  padding: "0 16px",
};

const msgsContainer: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "24px 0",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const bubbleBase: React.CSSProperties = {
  maxWidth: "85%",
  padding: "12px 16px",
  borderRadius: "var(--radius)",
  fontSize: "0.95rem",
  lineHeight: 1.5,
};

const inputBar: React.CSSProperties = {
  display: "flex",
  gap: 10,
  padding: "16px 0",
  borderTop: "1px solid var(--border)",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "12px 16px",
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--text)",
  fontSize: "0.95rem",
  outline: "none",
};

const sendBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "12px 24px",
  background: disabled ? "var(--bg-input)" : "var(--accent)",
  color: disabled ? "var(--text-muted)" : "#fff",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  fontWeight: 600,
  fontSize: "0.95rem",
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "background 0.15s",
});

const profileBar: React.CSSProperties = {
  padding: "10px 16px",
  background: "var(--bg-card)",
  borderRadius: "var(--radius-sm)",
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 12,
  fontSize: "0.8rem",
  color: "var(--text-muted)",
  borderBottom: "1px solid var(--border)",
};

// ─── Helpers ──────────────────────────────────────────────────────

function filledCount(profile: CareerProfile): number {
  return Object.values(profile).filter((v) => v !== undefined && v !== null)
    .length;
}

function SkeletonBubble({ align }: { align: "left" | "right" }) {
  return (
    <div
      style={{
        ...bubbleBase,
        alignSelf: align === "right" ? "flex-end" : "flex-start",
        background: "var(--bg-card)",
        width: align === "right" ? 160 : 280,
        height: 44,
        borderRadius: "var(--radius)",
        opacity: 0.5,
        animation: "pulse 1.4s ease-in-out infinite",
      }}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────

export default function Onboarding() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const sessionId = params.get("session");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profile, setProfile] = useState<CareerProfile>({});
  const [input, setInput] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [intakeComplete, setIntakeComplete] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<
    "intake" | "analyzing" | "complete" | "error" | null
  >(null);
  const track = useTrack(trackId);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load session + resolve track
  useEffect(() => {
    if (!sessionId) return;
    setLoadState("loading");

    getSession(sessionId)
      .then((s) => {
        setSessionStatus(s.status);

        // If already beyond intake, redirect to the right page
        if (s.status === "analyzing" || s.status === "complete") {
          nav(`/results/${sessionId}`, { replace: true });
          return;
        }

        if (s.status === "error") {
          setMessages(s.messages);
          setProfile(s.profile);
          setTrackId(s.trackId);
          setAnalyzeError(
            "This session ended in an error state. Start a new assessment to continue.",
          );
          setLoadState("ready");
          return;
        }

        setMessages(s.messages);
        setProfile(s.profile);
        setTrackId(s.trackId);

        // Detect if session was previously completed through intake
        const lastMsg = s.messages[s.messages.length - 1];
        if (
          s.status === "intake" &&
          lastMsg?.content.includes("profile is ready for analysis")
        ) {
          setIntakeComplete(true);
        }

        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  }, [sessionId, nav]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !sessionId || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    setSendError(null);

    try {
      const res = await sendMessage(sessionId, text);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: text,
          timestamp: new Date().toISOString(),
        },
        res.message,
      ]);
      setProfile((prev) => ({ ...prev, ...res.profileUpdate }));

      if (res.message.content.includes("profile is ready for analysis")) {
        setIntakeComplete(true);
      }
    } catch (err) {
      setSendError(
        err instanceof ApiError
          ? `Failed to send (${err.status}). Try again.`
          : "Network error — check your connection.",
      );
      // Restore input so user doesn't lose their answer
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  async function handleAnalyze() {
    if (!sessionId) return;

    if (sessionStatus !== "intake") {
      setAnalyzeError(
        "This session is no longer ready to analyze. Start a new assessment.",
      );
      return;
    }

    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      await triggerAnalysis(sessionId);
      nav(`/results/${sessionId}`);
    } catch (err) {
      setAnalyzing(false);
      setAnalyzeError(
        err instanceof ApiError && err.status === 503
          ? "Analysis service unavailable. Try again in a moment."
          : err instanceof ApiError
            ? err.message
            : "Could not start analysis. Please try again.",
      );
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── No session param ──
  if (!sessionId) {
    return (
      <div
        style={{
          ...wrap,
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          flex: 1,
        }}
      >
        <p style={{ color: "var(--text-muted)" }}>No session found.</p>
        <Link to="/" style={{ color: "var(--accent)", fontWeight: 600 }}>
          Start a new assessment →
        </Link>
      </div>
    );
  }

  // ── Loading skeleton ──
  if (loadState === "loading") {
    return (
      <div style={wrap}>
        <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.25} }`}</style>
        <div style={profileBar}>
          <span>Loading session…</span>
        </div>
        <div style={msgsContainer}>
          <SkeletonBubble align="left" />
        </div>
        <div style={inputBar}>
          <div style={{ ...inputStyle, opacity: 0.4 }} />
          <button style={sendBtnStyle(true)} disabled>
            Send
          </button>
        </div>
      </div>
    );
  }

  // ── Error loading session ──
  if (loadState === "error") {
    return (
      <div
        style={{
          ...wrap,
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          flex: 1,
        }}
      >
        <p style={{ fontWeight: 600 }}>Session not found or unavailable.</p>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.875rem",
            maxWidth: 320,
            textAlign: "center",
          }}
        >
          The session may have expired or the API is unreachable.
        </p>
        <Link
          to="/"
          style={{
            padding: "10px 24px",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "var(--radius)",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Start a new assessment
        </Link>
      </div>
    );
  }

  // ── Ready ──
  if (sessionStatus === "error") {
    return (
      <div
        style={{
          ...wrap,
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          flex: 1,
        }}
      >
        <p style={{ fontWeight: 600 }}>This session cannot be analyzed.</p>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.875rem",
            maxWidth: 420,
            textAlign: "center",
          }}
        >
          The session is in an error state, so Analyze is disabled. Start a new
          assessment to continue.
        </p>
        <Link
          to="/"
          style={{
            padding: "10px 24px",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "var(--radius)",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Start a new assessment
        </Link>
      </div>
    );
  }

  const filled = filledCount(profile);

  return (
    <div style={wrap}>
      <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.25} }`}</style>

      <div style={profileBar}>
        {track && (
          <span
            style={{
              padding: "2px 10px",
              borderRadius: 12,
              fontSize: "0.72rem",
              fontWeight: 700,
              color: track.color ?? "var(--accent)",
              border: `1px solid ${track.color ?? "var(--accent)"}`,
              whiteSpace: "nowrap",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {track.name}
          </span>
        )}
        <span style={{ whiteSpace: "nowrap" }}>Profile {filled}/12</span>
        <div
          style={{
            flex: 1,
            height: 5,
            background: "var(--bg-input)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.round((filled / 12) * 100)}%`,
              height: "100%",
              background: intakeComplete ? "var(--success)" : "var(--accent)",
              transition: "width 0.3s",
              borderRadius: 3,
            }}
          />
        </div>
        {intakeComplete && (
          <span
            style={{
              color: "var(--success)",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Ready ✓
          </span>
        )}
      </div>

      <div style={msgsContainer}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              ...bubbleBase,
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background:
                m.role === "user" ? "var(--accent)" : "var(--bg-card)",
              color: m.role === "user" ? "#fff" : "var(--text)",
              border:
                m.role === "assistant" ? "1px solid var(--border)" : "none",
            }}
          >
            {m.content}
          </div>
        ))}

        {sending && (
          <div
            style={{
              ...bubbleBase,
              alignSelf: "flex-start",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              opacity: 0.6,
              fontSize: "0.85rem",
            }}
          >
            Thinking…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {sendError && (
        <div
          style={{
            padding: "8px 14px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid var(--danger)",
            borderRadius: "var(--radius-sm)",
            color: "var(--danger)",
            fontSize: "0.825rem",
            marginBottom: 8,
          }}
        >
          {sendError}
        </div>
      )}

      {intakeComplete ? (
        <div
          style={{
            ...inputBar,
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            paddingBottom: 24,
          }}
        >
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Your profile is complete. Ready to see your career matches?
          </p>
          <button
            style={{
              padding: "14px 40px",
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "#fff",
              background: analyzing ? "var(--bg-card)" : "var(--success)",
              border: analyzing ? "1px solid var(--border)" : "none",
              borderRadius: "var(--radius)",
              cursor: analyzing ? "not-allowed" : "pointer",
              opacity: analyzing ? 0.7 : 1,
              transition: "background 0.2s",
            }}
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? "Launching Analysis…" : "Analyze My Career Profile"}
          </button>
          {analyzeError && (
            <p style={{ color: "var(--danger)", fontSize: "0.825rem" }}>
              {analyzeError}
            </p>
          )}
        </div>
      ) : (
        <div style={inputBar}>
          <input
            style={inputStyle}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sending ? "" : "Type your answer and press Enter…"}
            disabled={sending}
            autoFocus
          />
          <button
            style={sendBtnStyle(sending || !input.trim())}
            onClick={handleSend}
            disabled={sending || !input.trim()}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
