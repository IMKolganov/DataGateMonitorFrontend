import type { OvpnFileConfigResponse } from "../api/orvalModelShim";

/** Default VLESS client export template (JSON profile for DataGate clients).
 * dns_* placeholders are filled from node DNS1/DNS2 / XRAY_DNS_IDENTITY_* at link issue time.
 * Keep pretty-printed — dashboard editor and “Insert example” use this string as-is.
 */
/** Hostname only for VLESS export endpoint (no https:// or :port). */
export function sanitizeXrayExportEndpointHost(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (v.includes("://")) {
    try {
      return new URL(v).hostname;
    } catch {
      return v.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0];
    }
  }
  if (!v.includes("/") && /^[^:]+:\d+$/.test(v)) {
    return v.split(":")[0];
  }
  return v.replace(/\/+$/, "");
}

export const XRAY_EXPORT_TEMPLATE = `{
  "vless": "{{vless_uri}}",
  "dnsServers": {{dns_servers_json}},
  "dnsIdentityEnabled": {{dns_identity_enabled}},
  "friendlyName": "{{friendly_name}}",
  "uuid": "{{uuid}}",
  "endpoint": "{{server_ip}}:{{server_port}}"
}
`;

/** Post-setup seeded a plain-text VLESS block before JSON profiles — detect for UI upgrade prompt. */
export function isLegacyXrayExportTemplate(template: string): boolean {
  const t = template.trim();
  if (!t) return false;
  return !t.startsWith("{") || !t.includes("dnsServers") || !t.includes("{{dns_servers_json}}");
}

/** Default OpenVPN .ovpn export template for new servers.
 * Port/proto/cipher/auth/tls-version-min/verb are rewritten from live node /api/info on save (auto-detect)
 * and again from node env when issuing the file.
 */
export const OPEN_VPN_EXPORT_TEMPLATE = `setenv FRIENDLY_NAME "{{friendly_name}}"
client
dev tun
proto udp
remote {{server_ip}} {{server_port}}
resolv-retry infinite
nobind
remote-cert-tls server
tls-version-min 1.2
cipher AES-128-GCM
data-ciphers AES-128-GCM:CHACHA20-POLY1305
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
