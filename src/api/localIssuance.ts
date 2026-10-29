import { useQuery } from "@tanstack/react-query";
import {
  getApiOpenVpnFilesOriginsVpnServerId,
  getGetApiOpenVpnFilesOriginsVpnServerIdQueryKey,
} from "./orval/open-vpn-file-origins/open-vpn-file-origins";
import { getApiOpenVpnServersDiscoveriesDiscoveryIdNodeKey } from "./orval/vpn-node-local-issuance/vpn-node-local-issuance";
import type {
  LocalIssuanceDtoIssuedOvpnFileOriginDto as IssuedOvpnFileOrigin,
  LocalIssuanceResponsesNodeKeyStatusResponse as NodeKeyStatus,
} from "./orval/model";
import { orvalPayload } from "./orvalPayload";

// Both contracts and HTTP calls are generated from the backend OpenAPI schema.
export type { IssuedOvpnFileOrigin, NodeKeyStatus };
export const ovpnFileOriginsQueryKey = getGetApiOpenVpnFilesOriginsVpnServerIdQueryKey;

export function useOvpnFileOrigins(vpnServerId: number, enabled: boolean) {
  return useQuery({
    queryKey: ovpnFileOriginsQueryKey(vpnServerId),
    queryFn: async ({ signal }) => orvalPayload<IssuedOvpnFileOrigin[] | null>(
      await getApiOpenVpnFilesOriginsVpnServerId(vpnServerId, undefined, signal),
    ) ?? [],
    enabled,
    staleTime: 10_000,
    retry: 1,
  });
}

export function useDiscoveryNodeKey(discoveryId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["api", "open-vpn-servers", "discoveries", discoveryId, "node-key"] as const,
    queryFn: async ({ signal }) => orvalPayload<NodeKeyStatus>(
      await getApiOpenVpnServersDiscoveriesDiscoveryIdNodeKey(discoveryId, undefined, signal),
    ),
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}

/** Index by IssuedOvpnFile id; tolerates a missing/failed origins call (older backend). */
export function indexOvpnFileOrigins(
  origins: IssuedOvpnFileOrigin[] | undefined | null,
): Map<number, IssuedOvpnFileOrigin> {
  const map = new Map<number, IssuedOvpnFileOrigin>();
  for (const o of Array.isArray(origins) ? origins : []) {
    if (o && typeof o.issuedOvpnFileId === "number") map.set(o.issuedOvpnFileId, o);
  }
  return map;
}

/** Fingerprint in groups of 4 for eyeballing against `datagate-profile node-id`. */
export function formatFingerprint(fp: string): string {
  return fp.match(/.{1,4}/g)?.join(" ") ?? fp;
}
