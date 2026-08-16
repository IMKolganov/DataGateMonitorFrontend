/**
 * Normalize Pi-hole client subnet prefix for StartsWith matching.
 * Ensures a trailing "." so "10.80.0" and "10.80.0." compare equal and
 * "10.80.0" does not accidentally match "10.80.01.x".
 */
export function normalizePiHoleClientSubnetPrefix(raw?: string | null): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  if (trimmed.endsWith(".")) return trimmed;
  // IPv4 dotted prefix (e.g. 10.80.0 or 10.51.15) — append trailing dot.
  if (/^\d{1,3}(\.\d{1,3}){0,3}$/.test(trimmed)) return `${trimmed}.`;
  return trimmed;
}

export function piHoleClientSubnetPrefixesEqual(a?: string | null, b?: string | null): boolean {
  return normalizePiHoleClientSubnetPrefix(a) === normalizePiHoleClientSubnetPrefix(b);
}
