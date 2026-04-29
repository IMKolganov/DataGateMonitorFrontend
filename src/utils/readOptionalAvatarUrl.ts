/** Reads optional `avatarUrl` from API payloads not yet in the OpenAPI spec. */
export function readOptionalAvatarUrl(row: object): string | undefined {
  const v = (row as Record<string, unknown>)["avatarUrl"];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
