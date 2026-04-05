import type { CSSProperties } from "react";

type LogoVariant = "full" | "icon" | "wordmark";
type LogoSize = "sm" | "md" | "lg" | "xl";
type LogoTone = "auto" | "light" | "dark";
type LogoTrack =
  | "general"
  | "tech"
  | "healthcare"
  | "creative"
  | "tech-career"
  | "healthcare-pivot"
  | "creative-industry";

interface PathFinderLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  track?: LogoTrack;
  tone?: LogoTone;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

interface TrackPalette {
  primary: string;
  secondary: string;
  text: string;
  aiAccent: string;
}

const trackPaletteById: Record<string, TrackPalette> = {
  general: {
    primary: "#2C3E50",
    secondary: "#5A6C7D",
    text: "var(--pf-color-text-primary)",
    aiAccent: "var(--pf-color-brand-500)",
  },
  tech: {
    primary: "#0066FF",
    secondary: "#00D4FF",
    text: "var(--pf-color-text-primary)",
    aiAccent: "var(--pf-color-brand-500)",
  },
  "tech-career": {
    primary: "#0066FF",
    secondary: "#00D4FF",
    text: "var(--pf-color-text-primary)",
    aiAccent: "var(--pf-color-brand-500)",
  },
  healthcare: {
    primary: "#008B8B",
    secondary: "#20B2AA",
    text: "var(--pf-color-text-primary)",
    aiAccent: "var(--pf-color-brand-500)",
  },
  "healthcare-pivot": {
    primary: "#008B8B",
    secondary: "#20B2AA",
    text: "var(--pf-color-text-primary)",
    aiAccent: "var(--pf-color-brand-500)",
  },
  creative: {
    primary: "#8B35C4",
    secondary: "#C44BB8",
    text: "var(--pf-color-text-primary)",
    aiAccent: "var(--pf-color-brand-500)",
  },
  "creative-industry": {
    primary: "#8B35C4",
    secondary: "#C44BB8",
    text: "var(--pf-color-text-primary)",
    aiAccent: "var(--pf-color-brand-500)",
  },
};

const darkTrackPaletteById: Record<string, TrackPalette> = {
  general: {
    primary: "#E8F2FC",
    secondary: "#BCCFE3",
    text: "#F4F8FD",
    aiAccent: "#FFFFFF",
  },
  tech: {
    primary: "#8DB8FF",
    secondary: "#7EE8FF",
    text: "#EAF3FF",
    aiAccent: "#C7F8FF",
  },
  "tech-career": {
    primary: "#8DB8FF",
    secondary: "#7EE8FF",
    text: "#EAF3FF",
    aiAccent: "#C7F8FF",
  },
  healthcare: {
    primary: "#7BD9CB",
    secondary: "#9BF3E7",
    text: "#E9FFFB",
    aiAccent: "#D2FFF7",
  },
  "healthcare-pivot": {
    primary: "#7BD9CB",
    secondary: "#9BF3E7",
    text: "#E9FFFB",
    aiAccent: "#D2FFF7",
  },
  creative: {
    primary: "#D6A6FF",
    secondary: "#F1B2FF",
    text: "#F8EDFF",
    aiAccent: "#FFD9FF",
  },
  "creative-industry": {
    primary: "#D6A6FF",
    secondary: "#F1B2FF",
    text: "#F8EDFF",
    aiAccent: "#FFD9FF",
  },
};

const sizePreset = {
  sm: {
    icon: 20,
    text: "0.9rem",
    gap: 8,
    iconStroke: 1.7,
  },
  md: {
    icon: 24,
    text: "1rem",
    gap: 9,
    iconStroke: 1.8,
  },
  lg: {
    icon: 32,
    text: "1.2rem",
    gap: 10,
    iconStroke: 1.9,
  },
  xl: {
    icon: 44,
    text: "1.5rem",
    gap: 12,
    iconStroke: 2,
  },
} as const;

function normalizeTrack(track: LogoTrack): keyof typeof trackPaletteById {
  if (track === "tech-career") return "tech";
  if (track === "healthcare-pivot") return "healthcare";
  if (track === "creative-industry") return "creative";
  return track;
}

function CompassIcon({
  size,
  strokeWidth,
  palette,
}: {
  size: number;
  strokeWidth: number;
  palette: TrackPalette;
}) {
  const rays = Array.from({ length: 12 }, (_, idx) => {
    const angle = (Math.PI * 2 * idx) / 12;
    const isCardinal = idx % 3 === 0;
    const inner = 20;
    const outer = isCardinal ? 30 : 27;
    const x1 = 32 + Math.cos(angle) * inner;
    const y1 = 32 + Math.sin(angle) * inner;
    const x2 = 32 + Math.cos(angle) * outer;
    const y2 = 32 + Math.sin(angle) * outer;

    return {
      key: `ray-${idx}`,
      x1,
      y1,
      x2,
      y2,
      width: isCardinal ? strokeWidth + 0.2 : strokeWidth,
      opacity: isCardinal ? 0.9 : 0.55,
    };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pf-logo-gradient" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor={palette.primary} />
          <stop offset="100%" stopColor={palette.secondary} />
        </linearGradient>
      </defs>

      <circle
        cx="32"
        cy="32"
        r="24"
        stroke="url(#pf-logo-gradient)"
        strokeWidth={strokeWidth}
        opacity="0.28"
      />
      <circle
        cx="32"
        cy="32"
        r="13"
        stroke="url(#pf-logo-gradient)"
        strokeWidth={strokeWidth}
        opacity="0.36"
      />

      {rays.map((ray) => (
        <line
          key={ray.key}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          stroke="url(#pf-logo-gradient)"
          strokeWidth={ray.width}
          strokeLinecap="round"
          opacity={ray.opacity}
        />
      ))}

      <path
        d="M32 32 44 20"
        stroke="url(#pf-logo-gradient)"
        strokeWidth={strokeWidth + 0.4}
        strokeLinecap="round"
      />
      <path
        d="M41.2 20H44v2.8"
        stroke="url(#pf-logo-gradient)"
        strokeWidth={strokeWidth + 0.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 32 24 40"
        stroke="url(#pf-logo-gradient)"
        strokeWidth={strokeWidth + 0.1}
        strokeLinecap="round"
        opacity="0.8"
      />

      <circle cx="32" cy="32" r="3.1" fill={palette.primary} />
      <circle cx="32" cy="32" r="1.6" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

function Wordmark({
  size,
  color,
  aiColor,
}: {
  size: LogoSize;
  color: string;
  aiColor: string;
}) {
  const fontBySize: Record<LogoSize, { pf: string; ai: string }> = {
    sm: { pf: "0.95rem", ai: "0.72rem" },
    md: { pf: "1.05rem", ai: "0.76rem" },
    lg: { pf: "1.3rem", ai: "0.88rem" },
    xl: { pf: "1.72rem", ai: "1rem" },
  };

  const font = fontBySize[size];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 6,
        color,
      }}
    >
      <span
        style={{
          fontFamily: "var(--pf-font-family-display)",
          fontSize: font.pf,
          fontWeight: 800,
          letterSpacing: "-0.012em",
          lineHeight: 1,
        }}
      >
        PathFinder
      </span>
      <span
        style={{
          fontFamily: "var(--pf-font-family-accent)",
          fontSize: font.ai,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: aiColor,
          lineHeight: 1,
        }}
      >
        AI
      </span>
    </span>
  );
}

export function PathFinderLogo({
  variant = "full",
  size = "md",
  track = "general",
  tone = "auto",
  title = "PathFinder AI",
  className,
  style,
}: PathFinderLogoProps) {
  const normalizedTrack = normalizeTrack(track);
  const lightPalette =
    trackPaletteById[normalizedTrack] ?? trackPaletteById.general;
  const darkPalette =
    darkTrackPaletteById[normalizedTrack] ?? darkTrackPaletteById.general;
  const palette = tone === "dark" ? darkPalette : lightPalette;
  const preset = sizePreset[size];

  if (variant === "icon") {
    return (
      <span
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          ...style,
        }}
        aria-label={title}
      >
        <CompassIcon
          size={preset.icon}
          strokeWidth={preset.iconStroke}
          palette={palette}
        />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          ...style,
        }}
        aria-label={title}
      >
        <Wordmark size={size} color={palette.text} aiColor={palette.aiAccent} />
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: preset.gap,
        ...style,
      }}
      aria-label={title}
    >
      <CompassIcon
        size={preset.icon}
        strokeWidth={preset.iconStroke}
        palette={palette}
      />
      <Wordmark size={size} color={palette.text} aiColor={palette.aiAccent} />
    </span>
  );
}
