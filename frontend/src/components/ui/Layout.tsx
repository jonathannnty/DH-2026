import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { House, LayoutDashboard, MoonStar, Sun } from "lucide-react";
import { IconLabel } from "@/components/ui/IconLabel";
import { PathFinderLogo } from "@/components/PathFinderLogo";

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
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
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
  border:
    "1px solid color-mix(in srgb, var(--pf-color-brand-400) 28%, transparent)",
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
  { to: "/", label: "Home", icon: House },
  { to: "/dashboard", label: "Sessions", icon: LayoutDashboard },
];

type ThemeMode = "dark" | "light";
type LogoTrack =
  | "general"
  | "tech"
  | "healthcare"
  | "creative"
  | "tech-career"
  | "healthcare-pivot"
  | "creative-industry";

function resolveLogoTrack(pathname: string, search: string): LogoTrack {
  const rawTrack = new URLSearchParams(search).get("track");
  const isTrackFlowRoute =
    pathname.startsWith("/onboarding") || pathname.startsWith("/results");

  if (!isTrackFlowRoute || !rawTrack) {
    return "general";
  }

  switch (rawTrack) {
    case "tech":
    case "tech-career":
      return rawTrack;
    case "healthcare":
    case "healthcare-pivot":
      return rawTrack;
    case "creative":
    case "creative-industry":
      return rawTrack;
    default:
      return "general";
  }
}

function getInitialTheme(): ThemeMode {
  if (typeof document !== "undefined") {
    const existingTheme = document.documentElement.dataset.theme;
    if (existingTheme === "dark" || existingTheme === "light") {
      return existingTheme;
    }
  }

  if (typeof window !== "undefined") {
    const storedTheme = window.localStorage.getItem("pf-theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }

    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  }

  return "dark";
}

export default function Layout({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const { pathname, search } = useLocation();
  const shellRef = useRef<HTMLDivElement>(null);
  const previousThemeRef = useRef<ThemeMode | null>(null);
  const themeTransitionTimerRef = useRef<number | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  const isHome = pathname === "/";
  const isDashboard = pathname === "/dashboard";
  const logoTrack = resolveLogoTrack(pathname, search);

  const ambientMood = isHome
    ? "home"
    : isDashboard
      ? "dashboard"
      : pathname.startsWith("/onboarding")
        ? "guided"
        : pathname.startsWith("/results")
          ? "results"
          : "default";

  const navTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 360, damping: 30 };

  useEffect(() => {
    const root = document.documentElement;
    const shouldAnimate =
      previousThemeRef.current !== null &&
      previousThemeRef.current !== theme &&
      !reduceMotion;

    if (themeTransitionTimerRef.current !== null) {
      window.clearTimeout(themeTransitionTimerRef.current);
      themeTransitionTimerRef.current = null;
    }

    if (shouldAnimate) {
      root.classList.add("pf-theme-transition");
    }

    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    window.localStorage.setItem("pf-theme", theme);
    previousThemeRef.current = theme;

    if (shouldAnimate) {
      themeTransitionTimerRef.current = window.setTimeout(() => {
        root.classList.remove("pf-theme-transition");
        themeTransitionTimerRef.current = null;
      }, 360);
    }
  }, [theme, reduceMotion]);

  useEffect(() => {
    return () => {
      if (themeTransitionTimerRef.current !== null) {
        window.clearTimeout(themeTransitionTimerRef.current);
      }
      document.documentElement.classList.remove("pf-theme-transition");
    };
  }, []);

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
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerdown", handlePointerMove, {
      passive: true,
    });
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
    <div className="app-shell" ref={shellRef} data-ambient-mood={ambientMood}>
      <div className="ambient-bg" aria-hidden="true">
        <span className="ambient-beam ambient-beam-a" />
        <span className="ambient-beam ambient-beam-b" />
        <span className="ambient-orb ambient-orb-a" />
        <span className="ambient-orb ambient-orb-b" />
        <span className="ambient-orb ambient-orb-c" />
        <span className="ambient-drift-lines" />
        <span className="ambient-cursor" />
        <span className="ambient-grid" />
        <span className="ambient-grain" />
      </div>
      <nav style={navStyle}>
        <Link to="/" style={logoStyle}>
          <PathFinderLogo
            variant="full"
            track={logoTrack}
            size="md"
            tone={theme}
          />
        </Link>
        <div style={navLinksStyle}>
          {navLinks.map((item) => {
            const Icon = item.icon;
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
                <IconLabel icon={Icon} variant="nav" style={linkLabelStyle}>
                  {item.label}
                </IconLabel>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-pressed={theme === "light"}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            style={{
              position: "relative",
              padding: "6px 14px",
              borderRadius: "var(--pf-radius-sm)",
              border: "1px solid var(--pf-surface-card-border)",
              background: "var(--pf-btn-secondary-bg)",
              color: "var(--pf-btn-secondary-text)",
              fontSize: "0.875rem",
              fontWeight: 600,
              overflow: "hidden",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {theme === "dark" ? (
              <IconLabel icon={Sun} variant="nav">
                Light mode
              </IconLabel>
            ) : (
              <IconLabel icon={MoonStar} variant="nav">
                Dark mode
              </IconLabel>
            )}
          </button>
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
