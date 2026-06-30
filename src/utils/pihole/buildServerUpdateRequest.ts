import type { UpdateServerRequest, VpnServerDto } from "../../api/orvalModelShim";
import { VpnServerType } from "../../constants/vpnServerType";

/** Build a full server update payload (preserves tags / quota links when ids are supplied). */
export function buildUpdateServerRequest(
  server: VpnServerDto,
  options: {
    isPiHoleEnabled?: boolean;
    tagIds?: number[];
    quotaPlanIds?: number[];
  },
): UpdateServerRequest {
  if (server.id == null || server.id <= 0) {
    throw new Error("Server id is required for update.");
  }

  return {
    id: server.id,
    serverType: server.serverType ?? VpnServerType.OpenVpn,
    serverName: String(server.serverName ?? "").trim(),
    apiUrl: server.apiUrl ?? null,
    isDefault: server.isDefault ?? false,
    isOnline: server.isOnline ?? false,
    isDisabled: server.isDisabled ?? false,
    latitude: server.latitude ?? null,
    longitude: server.longitude ?? null,
    isEnableWss: server.isEnableWss ?? false,
    isPiHoleEnabled: options.isPiHoleEnabled ?? server.isPiHoleEnabled ?? false,
    tagIds: options.tagIds ?? [],
    quotaPlanIds: options.quotaPlanIds ?? [],
  };
}

export function resolveTagIdsFromNames(
  tagNames: string[] | null | undefined,
  allTags: { id?: number; name?: string | null }[],
): number[] {
  const names = tagNames ?? [];
  if (names.length === 0 || allTags.length === 0) return [];
  return allTags
    .filter((t) => t.name != null && names.includes(t.name))
    .map((t) => t.id!)
    .filter((tagId): tagId is number => typeof tagId === "number");
}

export function resolveQuotaPlanIdsFromAllowedLinks(
  links: { quotaPlanId?: number | null }[] | null | undefined,
): number[] {
  return (links ?? [])
    .map((l) => l.quotaPlanId)
    .filter((planId): planId is number => typeof planId === "number" && planId > 0);
}

/** Unwrap quota-plan allowed-server API payloads (same shapes as ServerForm). */
export function unwrapAllowedQuotaPlanLinks(raw: unknown): { quotaPlanId?: number | null }[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as { quotaPlanId?: number | null }[];
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.items)) return r.items as { quotaPlanId?: number | null }[];
  const data = r.data as Record<string, unknown> | undefined;
  if (data && Array.isArray(data.items)) return data.items as { quotaPlanId?: number | null }[];
  return [];
}
