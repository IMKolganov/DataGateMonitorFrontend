/** Wall-clock when this module first evaluated (app boot). */
const APP_BOOT_MS = Date.now();

/**
 * Vite/Chrome often reports cancelled lazy imports as
 * `TypeError: Failed to fetch dynamically imported module` — the same text as a
 * real post-deploy missing chunk. Only treat that message as a deploy mismatch
 * after the tab has been open for a while; rapid route switches happen early
 * and must not hang a fullscreen "Reloading…" overlay.
 */
export const DYNAMIC_IMPORT_RELOAD_MIN_AGE_MS = 60_000;

/**
 * Detects stale-chunk / deploy mismatches that warrant a full page reload.
 * Must NOT treat abort/cancel (or early dynamic-import fetch failures) from
 * rapid route changes as a new deploy.
 */
export function looksLikeChunkLoadError(
  reason: unknown,
  nowMs: number = Date.now(),
  bootMs: number = APP_BOOT_MS,
): boolean {
  if (reason && typeof reason === "object") {
    const name = (reason as { name?: unknown }).name;
    if (name === "AbortError" || name === "CanceledError") return false;
  }

  const text =
    reason instanceof Error
      ? `${reason.name} ${reason.message}`
      : typeof reason === "string"
        ? reason
        : String(reason ?? "");

  if (/abort(ed)?|cancel(led)?/i.test(text) && !/ChunkLoadError/i.test(text)) {
    return false;
  }

  if (/ChunkLoadError/i.test(text) || /Loading chunk [\d]+ failed/i.test(text)) {
    return true;
  }

  if (/Failed to fetch dynamically imported module/i.test(text)) {
    return nowMs - bootMs >= DYNAMIC_IMPORT_RELOAD_MIN_AGE_MS;
  }

  return false;
}
