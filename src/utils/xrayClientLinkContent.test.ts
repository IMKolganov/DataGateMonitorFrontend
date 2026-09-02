import { describe, expect, it } from "vitest";
import {
  decodeXrayClientLinkContent,
  extractVlessUriFromClientLinkContent,
} from "./xrayClientLinkContent";

const VLESS =
  "vless://11111111-1111-1111-1111-111111111111@xs1-hel2.datagateapp.com:443?encryption=none&security=tls&type=tcp#DataGate";

describe("extractVlessUriFromClientLinkContent", () => {
  it("reads vless from JSON export profile", () => {
    const json = JSON.stringify({
      vless: VLESS,
      vlessXhttp: "",
      dnsServers: ["10.51.52.1"],
      dnsIdentityEnabled: true,
    });

    expect(extractVlessUriFromClientLinkContent(json)).toBe(VLESS);
  });

  it("falls back to vlessXhttp when primary is empty", () => {
    const xhttp =
      "vless://11111111-1111-1111-1111-111111111111@xs1-hel2.datagateapp.com:2053?type=xhttp#DataGate+xHTTP";
    const json = JSON.stringify({ vless: "", vlessXhttp: xhttp });

    expect(extractVlessUriFromClientLinkContent(json)).toBe(xhttp);
  });

  it("supports legacy plain-text template", () => {
    expect(extractVlessUriFromClientLinkContent(`${VLESS}\n# friendly name`)).toBe(VLESS);
  });

  it("decodes base64-wrapped JSON profile", () => {
    const json = JSON.stringify({ vless: VLESS });
    const encoded = btoa(json);

    expect(decodeXrayClientLinkContent(encoded)).toBe(json);
    expect(extractVlessUriFromClientLinkContent(encoded)).toBe(VLESS);
  });
});
