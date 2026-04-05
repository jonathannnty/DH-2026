import type { CSSProperties, ElementType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type IconLabelVariant = "nav" | "action" | "section" | "cta" | "compact";

const iconSpecsByVariant: Record<
  IconLabelVariant,
  { size: number; strokeWidth: number; gap: number }
> = {
  nav: { size: 14, strokeWidth: 1.9, gap: 6 },
  action: { size: 14, strokeWidth: 1.9, gap: 6 },
  section: { size: 14, strokeWidth: 1.9, gap: 6 },
  cta: { size: 16, strokeWidth: 2, gap: 8 },
  compact: { size: 13, strokeWidth: 1.9, gap: 6 },
};

interface IconLabelProps {
  icon: LucideIcon;
  children: ReactNode;
  variant?: IconLabelVariant;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  iconStyle?: CSSProperties;
}

export function IconLabel({
  icon: Icon,
  children,
  variant = "action",
  as,
  className,
  style,
  iconStyle,
}: IconLabelProps) {
  const Comp = as ?? "span";
  const spec = iconSpecsByVariant[variant];

  return (
    <Comp
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: spec.gap,
        ...style,
      }}
    >
      <Icon
        aria-hidden="true"
        size={spec.size}
        strokeWidth={spec.strokeWidth}
        style={{ flexShrink: 0, ...iconStyle }}
      />
      {children}
    </Comp>
  );
}

export function getIconSpec(variant: IconLabelVariant) {
  return iconSpecsByVariant[variant];
}
