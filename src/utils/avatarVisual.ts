import type { CSSProperties } from "react";

/** Deterministic hue 0–359 from any string (for initials background). */
export function stringHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

export function initialsFromLabel(label: string | null | undefined, maxLen = 2): string {
  const t = (label ?? "").trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]![0] ?? "";
    const b = parts[parts.length - 1]![0] ?? "";
    return (a + b).toUpperCase().slice(0, maxLen) || "?";
  }
  const one = parts[0] ?? t;
  return one.slice(0, maxLen).toUpperCase() || "?";
}

export function avatarBackgroundStyle(seed: string): CSSProperties {
  const hue = stringHue(seed || "?");
  return {
    background: `linear-gradient(135deg, hsl(${hue}, 55%, 42%) 0%, hsl(${(hue + 40) % 360}, 50%, 32%) 100%)`,
    color: "#fff",
  };
}
