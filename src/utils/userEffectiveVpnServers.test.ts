import { describe, expect, it } from "vitest";
import {
  namesForKnownVpnServers,
  pickActiveUserQuotaAssignment,
  resolveDisplayableVpnServerIds,
  resolveEffectiveVpnServerIds,
  VPN_SERVER_ACCESS_ALLOW,
  VPN_SERVER_ACCESS_DENY,
} from "./userEffectiveVpnServers";

describe("pickActiveUserQuotaAssignment", () => {
  it("matches backend GetActiveByUserId: only EffectiveTo == null", () => {
    const picked = pickActiveUserQuotaAssignment([
      {
        id: 1,
        quotaPlanId: 10,
        effectiveFrom: "2026-01-01T00:00:00Z",
        effectiveTo: "2026-12-31T00:00:00Z",
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
    ]);
    expect(picked?.id).toBe(3);
    expect(picked?.quotaPlanId).toBe(30);
  });

  it("returns null when every assignment is closed", () => {
    expect(
      pickActiveUserQuotaAssignment([
        {
          id: 1,
          quotaPlanId: 10,
          effectiveFrom: "2026-01-01T00:00:00Z",
          effectiveTo: "2026-02-01T00:00:00Z",
        },
      ]),
    ).toBeNull();
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

  it("deny wins over a personal grant on the same server", () => {
    expect(
      resolveEffectiveVpnServerIds({
        planAllowed: [{ vpnServerId: 1 }],
        personalRules: [
          { vpnServerId: 1, mode: VPN_SERVER_ACCESS_ALLOW },
          { vpnServerId: 1, mode: VPN_SERVER_ACCESS_DENY },
        ],
      }),
    ).toEqual([]);
  });
});

describe("resolveDisplayableVpnServerIds", () => {
  /** Prod dump shape for user 354 / plan Default (QuotaPlanId=2). */
  const stefaniaPlanAllowed = [
    3, 63, 65, 68, 75, 90, 91, 100, 102, 112, 113, 114, 115, 116, 120, 121, 122, 125, 126, 127,
  ].map((vpnServerId) => ({ vpnServerId }));

  const liveServerIds = [120, 121, 122, 125, 126, 127];

  it("stefania-shaped plan: drops soft-deleted allowlist orphans, keeps 6 live", () => {
    expect(
      resolveDisplayableVpnServerIds({
        hasActivePlan: true,
        planAllowed: stefaniaPlanAllowed,
        personalRules: [],
        liveServerIds,
      }),
    ).toEqual([120, 121, 122, 125, 126, 127]);
  });

  it("unrestricted (no active plan): all live minus personal denies", () => {
    expect(
      resolveDisplayableVpnServerIds({
        hasActivePlan: false,
        planAllowed: [],
        personalRules: [{ vpnServerId: 121, mode: VPN_SERVER_ACCESS_DENY }],
        liveServerIds,
      }),
    ).toEqual([120, 122, 125, 126, 127]);
  });

  it("personal grant can add a live server outside the plan", () => {
    expect(
      resolveDisplayableVpnServerIds({
        hasActivePlan: true,
        planAllowed: [{ vpnServerId: 120 }],
        personalRules: [{ vpnServerId: 125, mode: VPN_SERVER_ACCESS_ALLOW }],
        liveServerIds,
      }),
    ).toEqual([120, 125]);
  });

  it("personal grant on a deleted server does not surface", () => {
    expect(
      resolveDisplayableVpnServerIds({
        hasActivePlan: true,
        planAllowed: [],
        personalRules: [{ vpnServerId: 3, mode: VPN_SERVER_ACCESS_ALLOW }],
        liveServerIds,
      }),
    ).toEqual([]);
  });
});

describe("namesForKnownVpnServers", () => {
  it("drops ids missing from the live server list (soft-deleted orphans)", () => {
    expect(
      namesForKnownVpnServers([3, 10, 63], [
        { id: 10, serverName: "live-a" },
        { id: 99, serverName: "other", isDeleted: true },
      ]),
    ).toEqual(["live-a"]);
  });

  it("uses Server #id only when the live row has an empty name", () => {
    expect(
      namesForKnownVpnServers([5], [{ id: 5, serverName: "  " }]),
    ).toEqual(["Server #5"]);
  });

  it("stefania compact first-three were deleted; after filter names are live cities", () => {
    const ids = resolveDisplayableVpnServerIds({
      hasActivePlan: true,
      planAllowed: [3, 63, 65, 120, 121, 122].map((vpnServerId) => ({ vpnServerId })),
      personalRules: [],
      liveServerIds: [120, 121, 122],
    });
    const names = namesForKnownVpnServers(ids, [
      { id: 3, serverName: "Xray Server (VLESS)", isDeleted: true },
      { id: 63, serverName: "Helsinki", isDeleted: true },
      { id: 65, serverName: "Stockholm", isDeleted: true },
      { id: 120, serverName: "Frankfurt tcp" },
      { id: 121, serverName: "Frankfurt xray" },
      { id: 122, serverName: "Frankfurt udp" },
    ]);
    expect(names.slice(0, 3)).toEqual(["Frankfurt tcp", "Frankfurt xray", "Frankfurt udp"]);
  });
});
