import { describe, expect, it } from "vitest";
import {
  pickActiveUserQuotaAssignment,
  resolveEffectiveVpnServerIds,
  VPN_SERVER_ACCESS_ALLOW,
  VPN_SERVER_ACCESS_DENY,
} from "./userEffectiveVpnServers";

describe("pickActiveUserQuotaAssignment", () => {
  it("picks the newest assignment that covers now", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const picked = pickActiveUserQuotaAssignment(
      [
        {
          id: 1,
          quotaPlanId: 10,
          effectiveFrom: "2026-01-01T00:00:00Z",
          effectiveTo: "2026-03-01T00:00:00Z",
        },
        {
          id: 2,
          quotaPlanId: 20,
          effectiveFrom: "2026-05-01T00:00:00Z",
          effectiveTo: null,
        },
        {
          id: 3,
          quotaPlanId: 30,
          effectiveFrom: "2026-06-01T00:00:00Z",
          effectiveTo: null,
        },
      ],
      now,
    );
    expect(picked?.id).toBe(3);
    expect(picked?.quotaPlanId).toBe(30);
  });
});

describe("resolveEffectiveVpnServerIds", () => {
  it("unions plan allowlist with grants and subtracts blocks", () => {
    const ids = resolveEffectiveVpnServerIds({
      planAllowed: [{ vpnServerId: 1 }, { vpnServerId: 2 }],
      personalRules: [
        { vpnServerId: 3, mode: VPN_SERVER_ACCESS_ALLOW },
        { vpnServerId: 2, mode: VPN_SERVER_ACCESS_DENY },
      ],
    });
    expect(ids).toEqual([1, 3]);
  });

  it("returns only grants when plan allowlist is empty", () => {
    const ids = resolveEffectiveVpnServerIds({
      planAllowed: [],
      personalRules: [{ vpnServerId: 9, mode: VPN_SERVER_ACCESS_ALLOW }],
    });
    expect(ids).toEqual([9]);
  });
});
