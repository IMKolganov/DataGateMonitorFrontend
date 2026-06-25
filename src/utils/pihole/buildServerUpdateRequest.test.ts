import { describe, expect, it } from "vitest";
import {
  buildUpdateServerRequest,
  resolveQuotaPlanIdsFromAllowedLinks,
  resolveTagIdsFromNames,
} from "./buildServerUpdateRequest";
import { VpnServerType } from "../../constants/vpnServerType";

describe("buildUpdateServerRequest", () => {
  it("maps server dto to update payload with Pi-hole override", () => {
    const payload = buildUpdateServerRequest(
      {
        id: 5,
        serverType: VpnServerType.OpenVpn,
        serverName: "Norway 2",
        apiUrl: "http://openvpn:5010/",
        isPiHoleEnabled: false,
        tags: ["eu"],
      },
      { isPiHoleEnabled: true, tagIds: [1], quotaPlanIds: [2] },
    );

    expect(payload.id).toBe(5);
    expect(payload.isPiHoleEnabled).toBe(true);
    expect(payload.tagIds).toEqual([1]);
    expect(payload.quotaPlanIds).toEqual([2]);
  });
});

describe("resolveTagIdsFromNames", () => {
  it("maps tag names to ids", () => {
    expect(
      resolveTagIdsFromNames(["eu", "test"], [
        { id: 1, name: "eu" },
        { id: 2, name: "us" },
      ]),
    ).toEqual([1]);
  });
});

describe("resolveQuotaPlanIdsFromAllowedLinks", () => {
  it("extracts plan ids from allowed-server links", () => {
    expect(
      resolveQuotaPlanIdsFromAllowedLinks([
        { quotaPlanId: 3 },
        { quotaPlanId: null },
        { quotaPlanId: 7 },
      ]),
    ).toEqual([3, 7]);
  });
});
