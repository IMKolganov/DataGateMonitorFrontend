import type { NotificationDeliveryDto } from "../../api/orvalModelShim";
import { EnumsDeliveryStatus } from "../../api/orval/model";

export const MESSAGE_TRUNCATE_LENGTH = 80;
/** Keep grid cells short — exception stacks in delivery.error + autoHeight freeze the page. */
export const DELIVERY_ERROR_PREVIEW_LENGTH = 56;
export const MAX_KV_PARSE_CHARS = 8_000;
export const SERVER_DISCOVERED_TYPE = "server.discovered";

const DELIVERY_STATUS_LABEL: Record<number, string> = {
  [EnumsDeliveryStatus.NUMBER_0]: "Pending",
  [EnumsDeliveryStatus.NUMBER_1]: "Sent",
  [EnumsDeliveryStatus.NUMBER_2]: "Failed",
  [EnumsDeliveryStatus.NUMBER_3]: "Read",
};

export function deliveryStatusLabel(status: number | null | undefined): string {
  if (status == null) return "—";
  return DELIVERY_STATUS_LABEL[status] ?? `Status ${status}`;
}

export function deliveryBadgeClass(status: number | null | undefined): string {
  if (status === EnumsDeliveryStatus.NUMBER_2) return "notification-delivery-badge--failed";
  if (status === EnumsDeliveryStatus.NUMBER_1 || status === EnumsDeliveryStatus.NUMBER_3) {
    return "notification-delivery-badge--ok";
  }
  return "notification-delivery-badge--pending";
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function truncateOneLine(text: string, maxLen: number): string {
  const oneLine = collapseWhitespace(text);
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, Math.max(0, maxLen - 1))}…`;
}

/** Soften stored technical delivery errors for the grid (full text stays in title / details). */
export function humanizeDeliveryError(error: string): string {
  const trimmed = error.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .replace(/\s*\(no UserIdentityLink with provider=telegram\)\.?/i, "")
    .replace(
      /^Admin user (\d+) is not linked to Telegram\.?$/i,
      "Admin user $1 is not linked to Telegram",
    )
    .trim();
}

/** Drop long .NET namespaces so the exception type fits in a compact cell. */
function shortenExceptionPreview(error: string): string {
  return error.replace(/(?:[\w]+\.)+(\w+(?:Exception|Error):\s*)/g, "$1");
}

export function formatDeliveryLine(
  d: NotificationDeliveryDto,
  mode: "compact" | "full" = "full",
): string {
  const channel = (d.channel ?? "?").toLowerCase();
  const status = deliveryStatusLabel(d.status);
  if (!d.error) return `${channel}: ${status}`;
  const error = humanizeDeliveryError(d.error);
  if (mode === "compact") {
    return `${channel}: ${status} (${truncateOneLine(
      shortenExceptionPreview(error),
      DELIVERY_ERROR_PREVIEW_LENGTH,
    )})`;
  }
  return `${channel}: ${status} (${error})`;
}

export function formatDeliveriesSummary(
  deliveries: NotificationDeliveryDto[] | null | undefined,
): string {
  if (!deliveries?.length) return "—";
  return deliveries.map((d) => formatDeliveryLine(d, "full")).join("\n");
}

export function parseKvMessage(message: string): Record<string, string> {
  const out: Record<string, string> = {};
  const src =
    message.length > MAX_KV_PARSE_CHARS ? message.slice(0, MAX_KV_PARSE_CHARS) : message;
  for (const part of src.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = val;
  }
  return out;
}

export function parseDiscoveryIdFromMessage(message: string): number | undefined {
  const match = /DiscoveryId=(\d+)/i.exec(message);
  if (!match) return undefined;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : undefined;
}

export function formatServerDiscoveredMessage(message: string): string {
  const discoveryId = parseDiscoveryIdFromMessage(message);
  const kv = parseKvMessage(message);
  const name = kv.Name?.trim();
  const apiUrl = kv.ApiUrl?.trim();
  const parts = [
    "A new VPN server was discovered and is waiting for admin approval.",
    discoveryId != null ? `Discovery #${discoveryId}` : null,
    name ? `Suggested name: ${name}` : null,
    apiUrl ? `API URL: ${apiUrl}` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

/** Turn FileId=…; FileName=… dumps into a readable line with the name first. */
export function formatKeyValueNotificationMessage(message: string): string | null {
  const kv = parseKvMessage(message);
  const fileName = kv.FileName?.trim();
  const fileId = kv.FileId?.trim();
  const externalId = kv.ExternalId?.trim();
  const displayName = kv.DisplayName?.trim();
  const tokenId = kv.TokenId?.trim();
  const revoked = kv.Revoked?.trim();
  const serverId = kv.ServerId?.trim();
  const count = kv.Count?.trim();
  const token = kv.Token?.trim();

  const hasProfileKeys = Boolean(fileName || fileId || externalId || displayName || tokenId);
  if (!hasProfileKeys && !serverId && !count && !token) return null;

  const parts: string[] = [];
  if (displayName && externalId) {
    parts.push(`${displayName} (${externalId})`);
  } else if (displayName) {
    parts.push(displayName);
  } else if (externalId) {
    parts.push(`user ${externalId}`);
  }
  if (fileName) {
    parts.push(fileId ? `${fileName} (file #${fileId})` : fileName);
  } else if (fileId) {
    parts.push(`File #${fileId}`);
  }
  if (tokenId) {
    parts.push(`token #${tokenId}`);
  }
  if (serverId) {
    parts.push(`server #${serverId}`);
  }
  if (count != null && count !== "") {
    parts.push(`count ${count}`);
  }
  if (token) {
    parts.push(`token ${token}`);
  }
  if (revoked != null && revoked !== "") {
    parts.push(revoked.toLowerCase() === "true" ? "revoked" : `revoked=${revoked}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

export function formatNotificationMessage(type: string, messageRaw: string): string {
  if (!messageRaw) return "-";
  try {
    if (type === SERVER_DISCOVERED_TYPE) return formatServerDiscoveredMessage(messageRaw);
    return formatKeyValueNotificationMessage(messageRaw) ?? messageRaw;
  } catch {
    return messageRaw;
  }
}
