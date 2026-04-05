import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

const navStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 24px",
  borderBottom: "1px solid var(--pf-surface-card-border)",
  background: "var(--pf-surface-card-bg)",
  position: "sticky",
  top: 0,
  zIndex: 10,
};

const logoStyle: React.CSSProperties = {
  fontSize: "1.15rem",
  fontWeight: 800,
  fontFamily: "var(--pf-font-family-display)",
  color: "var(--pf-color-text-primary)",
  letterSpacing: "-0.01em",
};

const linkStyle = (active: boolean): React.CSSProperties => ({
  position: "relative",
  padding: "6px 14px",
  borderRadius: "var(--pf-radius-sm)",
  fontSize: "0.875rem",
  fontWeight: active ? 600 : 400,
  color: active ? "var(--pf-color-brand-500)" : "var(--pf-color-text-muted)",
  background: active ? "rgba(99,102,241,0.1)" : "transparent",
  transition: "all 0.15s",
  overflow: "hidden",
});

const navLinksStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  position: "relative",
};

const indicatorStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "var(--pf-radius-sm)",
  background:
    "linear-gradient(135deg, rgba(99,102,241,0.16), rgba(129,140,248,0.1))",
  border: "1px solid rgba(129,140,248,0.28)",
  zIndex: 0,
};

const underlineStyle: React.CSSProperties = {
  position: "absolute",
  left: 10,
  right: 10,
  bottom: 3,
  height: 2,
  borderRadius: 99,
  background: "var(--pf-color-brand-500)",
  zIndex: 0,
};

const linkLabelStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
};

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Sessions" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const { pathname } = useLocation();
  const shellRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === "/";
  const isDashboard = pathname === "/dashboard";

  const navTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 360, damping: 30 };

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || reduceMotion) return;

    let rafId = 0;

    const setCursorVars = (x: number, y: number, active: boolean) => {
      shell.style.setProperty("--pf-cursor-x", `${x}px`);
      shell.style.setProperty("--pf-cursor-y", `${y}px`);
      shell.style.setProperty("--pf-cursor-active", active ? "1" : "0");
    };

    const handlePointerMove = (event: PointerEvent) => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        setCursorVars(event.clientX, event.clientY, true);
      });
    };

    const handlePointerLeave = () => {
      setCursorVars(0, 0, false);
    };

    setCursorVars(0, 0, false);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("blur", handlePointerLeave);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("blur", handlePointerLeave);
    };
  }, [reduceMotion]);

  return (
    <div className="app-shell" ref={shellRef}>
      <div className="ambient-bg" aria-hidden="true">
        <span className="ambient-orb ambient-orb-a" />
        <span className="ambient-orb ambient-orb-b" />
        <span className="ambient-orb ambient-orb-c" />
        <span className="ambient-cursor" />
        <span className="ambient-grid" />
      </div>
      <nav style={navStyle}>
        <Link to="/" style={logoStyle}>
          PathFinder AI
        </Link>
        <div style={navLinksStyle}>
          {navLinks.map((item) => {
            const active =
              (item.to === "/" && isHome) ||
              (item.to === "/dashboard" && isDashboard);

            return (
              <Link key={item.to} to={item.to} style={linkStyle(active)}>
                {active && (
                  <>
                    <motion.span
                      layoutId="nav-active-surface"
                      style={indicatorStyle}
                      transition={navTransition}
                    />
                    <motion.span
                      layoutId="nav-active-underline"
                      style={underlineStyle}
                      transition={navTransition}
                    />
                  </>
                )}
                <span style={linkLabelStyle}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 1,
        }}
      >
        {children}
      </main>
    </div>
  );
}
