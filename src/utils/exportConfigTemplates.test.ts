import { describe, expect, it } from "vitest";
import { XRAY_EXPORT_TEMPLATE, isLegacyXrayExportTemplate, unwrapOvpnFileConfigPayload } from "./exportConfigTemplates";

/** Mirrors dashboard default + node ClientLinkService placeholder expansion. */
function expandDashboardXrayTemplate(vars: {
  vless: string;
  dnsServersJson: string;
  dnsIdentityEnabled: boolean;
  friendlyName: string;
  uuid: string;
  serverIp: string;
  serverPort: string;
}): string {
  return XRAY_EXPORT_TEMPLATE.trim()
    .replaceAll("{{vless_uri}}", vars.vless)
    .replaceAll("{{dns_servers_json}}", vars.dnsServersJson)
    .replaceAll("{{dns_identity_enabled}}", vars.dnsIdentityEnabled ? "true" : "false")
    .replaceAll("{{friendly_name}}", vars.friendlyName)
    .replaceAll("{{uuid}}", vars.uuid)
    .replaceAll("{{server_ip}}", vars.serverIp)
    .replaceAll("{{server_port}}", vars.serverPort);
}

describe("XRAY_EXPORT_TEMPLATE (dashboard → Android profile)", () => {
  it("includes DNS placeholders for node expansion at link issue", () => {
    expect(XRAY_EXPORT_TEMPLATE).toContain("{{vless_uri}}");
    expect(XRAY_EXPORT_TEMPLATE).toContain("{{dns_servers_json}}");
    expect(XRAY_EXPORT_TEMPLATE).toContain("{{dns_identity_enabled}}");
    expect(XRAY_EXPORT_TEMPLATE).toContain('"dnsServers"');
    expect(XRAY_EXPORT_TEMPLATE).toContain('"dnsIdentityEnabled"');
  });

  it("expands to parseable JSON with dnsServers array for Android extractExplicitDnsServers", () => {
    const raw = expandDashboardXrayTemplate({
      vless: "vless://11111111-1111-1111-1111-111111111111@xs2.example.com:443?encryption=none&type=tcp#DataGate",
      dnsServersJson: '["172.20.0.1"]',
      dnsIdentityEnabled: true,
      friendlyName: "xs2",
      uuid: "11111111-1111-1111-1111-111111111111",
      serverIp: "xs2.example.com",
      serverPort: "443",
    });

    expect(raw.trim().startsWith("{")).toBe(true);
    const profile = JSON.parse(raw) as {
      vless: string;
      dnsServers: string[];
      dnsIdentityEnabled: boolean;
      uuid: string;
      endpoint: string;
    };

    expect(profile.dnsServers).toEqual(["172.20.0.1"]);
    expect(profile.dnsIdentityEnabled).toBe(true);
    expect(profile.vless.startsWith("vless://")).toBe(true);
    expect(profile.endpoint).toBe("xs2.example.com:443");
    expect(profile.uuid).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("expands empty dnsServers when node has no DNS1/DNS2", () => {
    const profile = JSON.parse(
      expandDashboardXrayTemplate({
        vless: "vless://u@h:443?encryption=none&type=tcp#x",
        dnsServersJson: "[]",
        dnsIdentityEnabled: false,
        friendlyName: "plain",
        uuid: "u",
        serverIp: "h",
        serverPort: "443",
      }),
    ) as { dnsServers: string[]; dnsIdentityEnabled: boolean };

    expect(profile.dnsServers).toEqual([]);
    expect(profile.dnsIdentityEnabled).toBe(false);
  });
});

describe("isLegacyXrayExportTemplate", () => {
  it("flags old plain-text post-setup default", () => {
    expect(
      isLegacyXrayExportTemplate(
        "{{vless_uri}}\r\n# {{friendly_name}}\r\nUUID: {{uuid}}\r\nEndpoint: {{server_ip}}:{{server_port}}\r\n",
      ),
    ).toBe(true);
  });

  it("accepts current JSON profile", () => {
    expect(isLegacyXrayExportTemplate(XRAY_EXPORT_TEMPLATE)).toBe(false);
  });

  it("ignores empty template", () => {
    expect(isLegacyXrayExportTemplate("")).toBe(false);
  });
});

describe("unwrapOvpnFileConfigPayload", () => {
  it("reads camelCase and PascalCase configTemplate", () => {
    expect(
      unwrapOvpnFileConfigPayload({
        vpnServerId: 3,
        configTemplate: XRAY_EXPORT_TEMPLATE,
      })?.configTemplate,
    ).toContain("{{dns_servers_json}}");

    expect(
      unwrapOvpnFileConfigPayload({
        VpnServerId: 3,
        ConfigTemplate: XRAY_EXPORT_TEMPLATE,
      })?.configTemplate,
    ).toContain("dnsIdentityEnabled");
  });
});
