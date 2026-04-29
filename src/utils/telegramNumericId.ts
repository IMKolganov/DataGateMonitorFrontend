/**
 * Telegram user IDs are positive integers (often 8–12 digits). Used to decide when to load
 * `/api/tgbot-users/profile-photo-file/{id}` (JWT cannot be sent via plain `<img src>`).
 */
export function parseTelegramNumericId(value: string | number | null | undefined): number | undefined {
  if (value == null) return undefined;
  const s = typeof value === "number" ? String(Math.trunc(value)) : String(value).trim();
  if (!/^\d{5,20}$/.test(s)) return undefined;
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n <= 0) return undefined;
  return n;
}

/** Dashboard user row: Telegram sign-in uses numeric `externalId`. */
export function telegramPhotoIdForProvider(
  provider: string | null | undefined,
  externalId: string | null | undefined,
): number | undefined {
  const p = (provider ?? "").toLowerCase();
  if (!p.includes("telegram")) return undefined;
  return parseTelegramNumericId(externalId);
}
