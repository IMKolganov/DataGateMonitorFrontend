/** Mirrors backend <c>DataGateMonitor.SharedModels.Enums.VpnServerType</c>. */
export const VpnServerType = {
  OpenVpn: 0,
  Xray: 1,
} as const;

export type VpnServerTypeValue = (typeof VpnServerType)[keyof typeof VpnServerType];

export function vpnServerTypeLabel(v: number | null | undefined): string {
  if (v === VpnServerType.Xray) return "Xray";
  return "OpenVPN";
}
