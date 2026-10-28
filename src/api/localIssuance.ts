import { useQuery } from "@tanstack/react-query";
import { ogmMutator } from "./mutator";

/**
 * Node-local ("reverse") OpenVPN issuance extras. Hand-written: these backend contracts are not in
 * SharedModels / the orval spec yet.
 */
export type IssuedOvpnFileOrigin = {
  issuedOvpnFileId: number;
  /** "dashboard" | "local" */
  origin: string;
  isServiceProfile: boolean;
  staticIp?: string | null;
  certSerialNumber?: string | null;
  certFingerprintSha256?: string | null;
};

export type NodeKeyStatus = {
  trustedFingerprint?: string | null;
  pendingFingerprint?: string | null;
};

export const ovpnFileOriginsQueryKey = (vpnServerId: number) => ["api", "open-vpn-files", "origins", vpnServerId] as const;

export function useOvpnFileOrigins(vpnServerId: number, enabled: boolean) {
  return useQuery({
    queryKey: ovpnFileOriginsQueryKey(vpnServerId),
    queryFn: ({ signal }) =>
      ogmMutator<IssuedOvpnFileOrigin[]>({ url: `/api/open-vpn-files/origins/${vpnServerId}`, method: "GET", signal }),
    enabled,
    staleTime: 10_000,
    retry: 1,
  });
}

export function useDiscoveryNodeKey(discoveryId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["api", "open-vpn-servers", "discoveries", discoveryId, "node-key"] as const,
    queryFn: ({ signal }) =>
      ogmMutator<NodeKeyStatus>({
        url: `/api/open-vpn-servers/discoveries/${discoveryId}/node-key`,
        method: "GET",
        signal,
      }),
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
