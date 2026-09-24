/** Query param used by `/servers/add` to prefill from an existing server. */
export const DUPLICATE_FROM_QUERY = "duplicateFrom";

export function duplicateServerPath(serverId: number): string {
  return `/servers/add?${DUPLICATE_FROM_QUERY}=${encodeURIComponent(String(serverId))}`;
}

export function parseDuplicateFromParam(raw: string | null | undefined): number {
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

/** Suggest a distinct name when cloning a server for create. */
export function buildDuplicatedServerName(sourceName: string | null | undefined): string {
  const base = String(sourceName ?? "").trim() || "Server";
  if (/\s*\(copy(?:\s+\d+)?\)\s*$/i.test(base)) {
    const stripped = base.replace(/\s*\(copy(?:\s+\d+)?\)\s*$/i, "").trim() || "Server";
    return `${stripped} (copy)`;
  }
  return `${base} (copy)`;
}
