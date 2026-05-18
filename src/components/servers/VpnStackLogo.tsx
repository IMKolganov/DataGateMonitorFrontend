import { VpnServerType } from "../../constants/vpnServerType";

/** Padlock mark only; full wordmark is `/logos/openvpn.svg`. */
const OPENVPN_LOGO = "/logos/openvpn-icon.svg";

type VpnStackLogoProps = {
  serverType?: number | null;
  size?: number;
  className?: string;
};

/** Project X mark from Xray-core README (community logo, not a separate trademark). */
function XrayLogoMark({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      className={["server-status__stack-logo", "server-status__stack-logo--xray", className]
        .filter(Boolean)
        .join(" ")}
      width={size}
      height={size}
      viewBox="0 0 1000 1000"
      aria-hidden
      focusable="false"
    >
      <polygon fill="currentColor" points="530,530 900,530 650,650 530,1000" />
      <polygon fill="currentColor" points="470,530 470,900 350,650 0,530" />
      <polygon fill="currentColor" points="530,470 530,100 650,350 1000,470" />
      <polygon fill="currentColor" points="470,470 100,470 350,350 470,0" />
    </svg>
  );
}

/** OpenVPN padlock mark (Wikimedia, icon crop). Orange/blue brand colors work on light and dark UI. */
function OpenVpnLogoMark({
  size,
  className,
}: {
  size: number;
  className?: string;
}) {
  return (
    <img
      src={OPENVPN_LOGO}
      alt=""
      title="OpenVPN"
      className={["server-status__stack-logo", "server-status__stack-logo--openvpn", className]
        .filter(Boolean)
        .join(" ")}
      style={{
        height: size,
        width: size,
      }}
      draggable={false}
    />
  );
}

export function VpnStackLogo({ serverType, size = 18, className }: VpnStackLogoProps) {
  if (serverType === VpnServerType.Xray) {
    return <XrayLogoMark size={size} className={className} />;
  }
  return <OpenVpnLogoMark size={size} className={className} />;
}
