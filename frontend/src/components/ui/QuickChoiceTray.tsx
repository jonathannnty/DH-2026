import type { OnboardingQuickChoiceState } from "@/types";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface QuickChoiceTrayProps {
  state: OnboardingQuickChoiceState;
  onToggleValue: (value: string) => void;
  onClear?: () => void;
}

const wrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "14px 0 4px",
};

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const title: React.CSSProperties = {
  fontSize: "0.82rem",
  fontWeight: 700,
  color: "var(--pf-color-text-primary)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const helper: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "var(--pf-color-text-muted)",
  maxWidth: 520,
};

const countBadge: React.CSSProperties = {
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: "0.72rem",
  fontWeight: 700,
  color: "var(--pf-color-text-muted)",
  background: "var(--pf-color-bg-subtle)",
  border: "1px solid var(--pf-color-border-subtle)",
  whiteSpace: "nowrap",
};

const grid: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const chip = (
  selected: boolean,
  disabled: boolean,
  group: "base" | "followup",
): React.CSSProperties => ({
  padding: group === "followup" ? "8px 12px" : "8px 13px",
  borderRadius: 999,
  border: selected
    ? "1px solid var(--pf-chip-selected-border)"
    : group === "followup"
      ? "1px dashed var(--pf-chip-followup-border)"
      : "1px solid var(--pf-chip-border)",
  background: selected
    ? "var(--pf-chip-selected-bg)"
    : group === "followup"
      ? "var(--pf-chip-followup-bg)"
      : "var(--pf-chip-bg)",
  color: disabled ? "var(--pf-color-text-muted)" : "var(--pf-chip-text)",
  fontSize: "0.86rem",
  fontWeight: selected ? 700 : 600,
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "background 0.15s, border-color 0.15s, color 0.15s",
  opacity: disabled ? 0.55 : 1,
});

const footerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const limitText: React.CSSProperties = {
  fontSize: "0.76rem",
  color: "var(--pf-color-text-muted)",
};

const clearButton: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid var(--pf-btn-secondary-border)",
  background: "transparent",
  color: "var(--pf-btn-secondary-text)",
  fontSize: "0.76rem",
  fontWeight: 600,
};

function normalizeChoiceText(value: string): string {
  return value.trim().toLowerCase();
}

function draftMatchesSelectedValues(
  state: OnboardingQuickChoiceState,
): boolean {
  const draftValues = state.draftValue
    .split(/[,;\n]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map(normalizeChoiceText)
    .sort();

  const selectedValues = [...state.selectedValues]
    .map(normalizeChoiceText)
    .sort();

  if (draftValues.length !== selectedValues.length) return false;
  return draftValues.every((value, index) => value === selectedValues[index]);
}

export default function QuickChoiceTray({
  state,
  onToggleValue,
  onClear,
}: QuickChoiceTrayProps) {
  const reduceMotion = useReducedMotion();
  const collapsed =
    state.visible &&
    state.selectedValues.length >= state.maxSelections &&
    draftMatchesSelectedValues(state);

  const trayTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.24, ease: "easeOut" as const };

  return (
    <motion.div
      layout
      initial={false}
      animate={{
        maxHeight: collapsed ? 0 : 280,
        opacity: collapsed ? 0 : 1,
        y: collapsed ? -8 : 0,
        paddingTop: collapsed ? 0 : 14,
        paddingBottom: collapsed ? 0 : 4,
      }}
      transition={trayTransition}
      style={{
        ...wrap,
        overflow: "hidden",
        pointerEvents: collapsed ? "none" : "auto",
        marginTop: collapsed ? 0 : 0,
      }}
      aria-hidden={collapsed}
    >
      <motion.div layout style={headerRow}>
        <div>
          <div style={title}>{state.promptLabel}</div>
          <div style={helper}>{state.helperText}</div>
        </div>
        <div style={countBadge}>
          {state.selectedValues.length}/{state.maxSelections} selected
        </div>
      </motion.div>

      <motion.div layout style={grid}>
        <AnimatePresence initial={false}>
          {state.options.map((option) => (
            <motion.button
              layout
              initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduceMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }
              }
              transition={reduceMotion ? { duration: 0 } : { duration: 0.16 }}
              whileHover={
                !option.disabled && !reduceMotion
                  ? { y: -1, scale: 1.01 }
                  : undefined
              }
              whileTap={
                !option.disabled && !reduceMotion
                  ? { y: 1, scale: 0.985 }
                  : undefined
              }
              key={option.id}
              type="button"
              aria-pressed={option.selected}
              onClick={() => {
                if (option.disabled) return;
                onToggleValue(option.value);
              }}
              disabled={option.disabled}
              style={chip(option.selected, option.disabled, option.group)}
            >
              {option.label}
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>

      <motion.div layout style={footerRow}>
        <div style={limitText}>
          Tip: select up to {state.maxSelections} quick picks, then send or
          remove one to change course.
        </div>
        {state.selectedValues.length > 0 && onClear && (
          <motion.button
            type="button"
            onClick={onClear}
            style={clearButton}
            whileHover={!reduceMotion ? { y: -1, scale: 1.01 } : undefined}
            whileTap={!reduceMotion ? { y: 1, scale: 0.985 } : undefined}
          >
            Clear picks
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
