import type { OvpnFileConfigResponse } from "../api/orvalModelShim";

/** Default VLESS client export template (matches backend DefaultXrayClientLinkTemplate). */
export const XRAY_EXPORT_TEMPLATE = `{{vless_uri}}
# {{friendly_name}}
UUID: {{uuid}}
Endpoint: {{server_ip}}:{{server_port}}
`;

/** Default OpenVPN .ovpn export template for new servers. */
export const OPEN_VPN_EXPORT_TEMPLATE = `setenv FRIENDLY_NAME "{{friendly_name}}"
client
dev tun
proto tcp
remote {{server_ip}} {{server_port}}
resolv-retry infinite
nobind
remote-cert-tls server
tls-version-min 1.2
cipher AES-256-CBC
auth SHA256
auth-nocache
verb 3
<ca>
{{ca_cert}}
</ca>
<cert>
{{client_cert}}
</cert>
<key>
{{client_key}}
</key>
<tls-crypt>
{{tls_auth_key}}
</tls-crypt>`;

function readStr(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "string") return v;
  }
  return "";
}

function readNum(record: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function normalizeRecord(record: Record<string, unknown>): OvpnFileConfigResponse {
  return {
    id: readNum(record, "id", "Id") || undefined,
    vpnServerId: readNum(record, "vpnServerId", "VpnServerId") || undefined,
    vpnServerIp: readStr(record, "vpnServerIp", "VpnServerIp") || null,
    vpnServerPort: readNum(record, "vpnServerPort", "VpnServerPort") || undefined,
    configTemplate: readStr(record, "configTemplate", "ConfigTemplate") || null,
  };
}

function looksLikeConfigEntity(record: Record<string, unknown>): boolean {
  return (
    record.vpnServerId != null ||
    record.VpnServerId != null ||
    record.vpnServerIp != null ||
    record.VpnServerIp != null ||
    record.configTemplate != null ||
    record.ConfigTemplate != null
  );
}

/** Normalize GET/POST payload whether orval mutator already unwrapped ApiResponse. */
export function unwrapOvpnFileConfigPayload(raw: unknown): OvpnFileConfigResponse | null {
  if (raw == null || typeof raw !== "object") return null;

  const root = raw as Record<string, unknown>;
  if (looksLikeConfigEntity(root)) return normalizeRecord(root);

  const nested = root.data;
  if (nested != null && typeof nested === "object") {
    const inner = nested as Record<string, unknown>;
    if (looksLikeConfigEntity(inner)) return normalizeRecord(inner);
  }

  return null;
}
