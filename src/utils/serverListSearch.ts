import type { VpnServerWithStatusV2Dto } from "../api/orvalModelShim";

/** Host/IP-ish tokens from an API URL (hostname, or IPv4 embedded in the string). */
export function extractApiUrlSearchTokens(apiUrl: string | null | undefined): string[] {
  if (!apiUrl) return [];
  const tokens: string[] = [apiUrl];
  try {
    const parsed = new URL(apiUrl.includes("://") ? apiUrl : `https://${apiUrl}`);
    if (parsed.hostname) tokens.push(parsed.hostname);
  } catch {
    // keep raw url only
  }
  const ipv4 = apiUrl.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
  if (ipv4) tokens.push(...ipv4);
  return tokens;
}

export function collectServerSearchHaystack(raw: VpnServerWithStatusV2Dto): string[] {
  const vpn = raw.vpnServerResponses?.vpnServer ?? raw.openVpnServerResponses?.vpnServer;
  const status = raw.vpnServerStatusLogResponse;
  return [
    vpn?.serverName,
    vpn?.apiUrl,
    ...extractApiUrlSearchTokens(vpn?.apiUrl),
    status?.serverRemoteIp,
    status?.serverLocalIp,
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

/** Case-insensitive substring match against name, API URL, and status IPs. */
export function serverMatchesSearchQuery(
  raw: VpnServerWithStatusV2Dto,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return collectServerSearchHaystack(raw).some((part) => part.toLowerCase().includes(q));
}

export function isVpnServerDeleted(raw: VpnServerWithStatusV2Dto): boolean {
  const vpn = raw.vpnServerResponses?.vpnServer ?? raw.openVpnServerResponses?.vpnServer;
  return Boolean(vpn?.isDeleted);
}
