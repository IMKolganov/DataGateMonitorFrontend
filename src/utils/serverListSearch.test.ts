import { describe, expect, it } from "vitest";
import type { VpnServerWithStatusV2Dto } from "../api/orvalModelShim";
import {
  collectServerSearchHaystack,
  extractApiUrlSearchTokens,
  isVpnServerDeleted,
  serverMatchesSearchQuery,
} from "./serverListSearch";

function rawStub(partial: {
  serverName?: string;
  apiUrl?: string;
  isDeleted?: boolean;
  serverRemoteIp?: string;
  serverLocalIp?: string;
}): VpnServerWithStatusV2Dto {
  return {
    vpnServerResponses: {
      vpnServer: {
        serverName: partial.serverName,
        apiUrl: partial.apiUrl,
        isDeleted: partial.isDeleted,
      },
    },
    vpnServerStatusLogResponse: {
      serverRemoteIp: partial.serverRemoteIp,
      serverLocalIp: partial.serverLocalIp,
    },
  };
}

describe("extractApiUrlSearchTokens", () => {
  it("pulls hostname and embedded IPv4 from apiUrl", () => {
    const tokens = extractApiUrlSearchTokens("https://212.147.239.128:8443/api");
    expect(tokens).toContain("212.147.239.128");
    expect(tokens.some((t) => t.includes("212.147.239.128"))).toBe(true);
  });
});

describe("serverMatchesSearchQuery", () => {
  it("matches by remote IP", () => {
    const raw = rawStub({ serverName: "Helsinki", serverRemoteIp: "81.27.100.144" });
    expect(serverMatchesSearchQuery(raw, "81.27.100")).toBe(true);
    expect(serverMatchesSearchQuery(raw, "9.9.9.9")).toBe(false);
  });

  it("matches by apiUrl host IP", () => {
    const raw = rawStub({ apiUrl: "https://10.51.48.12:5010/" });
    expect(serverMatchesSearchQuery(raw, "10.51.48.12")).toBe(true);
  });

  it("matches by server name", () => {
    const raw = rawStub({ serverName: "Poland-1" });
    expect(serverMatchesSearchQuery(raw, "poland")).toBe(true);
  });

  it("empty query matches all", () => {
    expect(serverMatchesSearchQuery(rawStub({}), "  ")).toBe(true);
  });
});

describe("collectServerSearchHaystack / isVpnServerDeleted", () => {
  it("includes local and remote IPs", () => {
    const hay = collectServerSearchHaystack(
      rawStub({ serverLocalIp: "10.8.0.1", serverRemoteIp: "1.2.3.4" }),
    );
    expect(hay).toEqual(expect.arrayContaining(["10.8.0.1", "1.2.3.4"]));
  });

  it("detects deleted flag", () => {
    expect(isVpnServerDeleted(rawStub({ isDeleted: true }))).toBe(true);
    expect(isVpnServerDeleted(rawStub({ isDeleted: false }))).toBe(false);
  });
});
