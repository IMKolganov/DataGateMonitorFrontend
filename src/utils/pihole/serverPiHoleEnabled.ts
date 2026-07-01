import type { VpnServerDto } from "../../api/orvalModelShim";

/** Whether Pi-hole DNS integration is enabled on a VPN server DTO. */
export function serverPiHoleEnabled(
  server: Partial<Pick<VpnServerDto, "isPiHoleEnabled">> | null | undefined,
): boolean {
  return Boolean(server?.isPiHoleEnabled);
}

/** Show user DNS history for admins when a user is selected (server scope requires Pi-hole there). */
export function shouldShowUserDnsQueries(
  externalId: string | null | undefined,
  vpnServerId: number | null | undefined,
  serverPiHole: boolean,
  viewerIsAdmin: boolean,
): boolean {
  if (!viewerIsAdmin) return false;
  const ext = typeof externalId === "string" ? externalId.trim() : "";
  if (!ext) return false;
  if (vpnServerId == null || vpnServerId <= 0) return true;
  return serverPiHole;
}
