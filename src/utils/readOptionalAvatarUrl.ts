/** Reads optional avatar URL from payloads that may use different casing. */
export function readOptionalAvatarUrl(row: object): string | undefined {
  const data = row as Record<string, unknown>;
  const raw =
    data["avatarUrl"] ??
    data["AvatarUrl"] ??
    data["avatarURL"] ??
    data["photoUrl"] ??
    data["PhotoUrl"] ??
    data["picture"];

  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  return value.length > 0 ? value : undefined;
}
