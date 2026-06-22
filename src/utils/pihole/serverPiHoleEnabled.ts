import type { VpnServerDto } from "../../api/orvalModelShim";

/** Whether Pi-hole DNS integration is enabled on a VPN server DTO. */
export function serverPiHoleEnabled(
  server: Partial<Pick<VpnServerDto, "isPiHoleEnabled">> | null | undefined,
): boolean {
  return Boolean(server?.isPiHoleEnabled);
}

/** Show user DNS history when scoped to a server only if Pi-hole is enabled there. */
export function shouldShowUserDnsQueries(
  externalId: string | null | undefined,
  vpnServerId: number | null | undefined,
  serverPiHole: boolean,
): boolean {
  const ext = typeof externalId === "string" ? externalId.trim() : "";
  if (!ext) return false;
  if (vpnServerId == null || vpnServerId <= 0) return true;
  return serverPiHole;
}
