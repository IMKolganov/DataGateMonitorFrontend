/** Decode dashboard download payload (base64 UTF-8 or plain text). */
export function decodeXrayClientLinkContent(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const bytes = Uint8Array.from(atob(trimmed), (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes).trim();
  } catch {
    return trimmed;
  }
}

function readVlessField(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().startsWith("vless://")) {
      return value.trim();
    }
  }
  return "";
}

/** Extract a copy-ready VLESS URI from issued link file (JSON profile or legacy plain text). */
export function extractVlessUriFromClientLinkContent(raw: string): string {
  const decoded = decodeXrayClientLinkContent(raw);
  if (!decoded) return "";

  const line = decoded
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("vless://"));
  if (line) return line;

  try {
    const profile = JSON.parse(decoded) as Record<string, unknown>;
    const primary = readVlessField(profile, "vless", "Vless");
    if (primary) return primary;
    return readVlessField(profile, "vlessXhttp", "VlessXhttp");
  } catch {
    const match = decoded.match(/vless:\/\/[^\s"'`]+/i);
    return match?.[0]?.trim() ?? "";
  }
}
