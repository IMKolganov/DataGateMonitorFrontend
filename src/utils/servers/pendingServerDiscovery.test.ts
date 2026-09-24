import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  isPendingDiscoveryModalSnoozed,
  pendingDiscoveriesFingerprint,
  PENDING_DISCOVERY_SNOOZE_KEY,
  readPendingDiscoverySnoozeFingerprint,
  unwrapDiscoveryActionResult,
  unwrapPendingDiscoveries,
  writePendingDiscoverySnoozeFingerprint,
} from "./pendingServerDiscovery";

describe("pendingServerDiscovery utils", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("unwrapPendingDiscoveries reads discoveries from envelope or bare payload", () => {
    expect(unwrapPendingDiscoveries(undefined)).toEqual([]);
    expect(
      unwrapPendingDiscoveries({
        discoveries: [{ id: 1, apiUrl: "http://a/" }],
      }),
    ).toEqual([{ id: 1, apiUrl: "http://a/" }]);
    expect(
      unwrapPendingDiscoveries({
        data: { discoveries: [{ id: 2, apiUrl: "http://b/" }] },
      }),
    ).toEqual([{ id: 2, apiUrl: "http://b/" }]);
  });

  it("unwrapDiscoveryActionResult reads vpnServerId", () => {
    expect(unwrapDiscoveryActionResult({ vpnServerId: 9 })).toEqual({ vpnServerId: 9 });
    expect(unwrapDiscoveryActionResult({ data: { vpnServerId: 11 } })?.vpnServerId).toBe(11);
  });

  it("fingerprint is order-independent and ignores non-numbers", () => {
    expect(pendingDiscoveriesFingerprint([3, 1, 2])).toBe("1,2,3");
    expect(pendingDiscoveriesFingerprint([2, 1, 3])).toBe("1,2,3");
    expect(pendingDiscoveriesFingerprint([1, null, undefined, 2])).toBe("1,2");
    expect(pendingDiscoveriesFingerprint([])).toBe("");
  });

  it("snooze helpers round-trip through sessionStorage", () => {
    expect(readPendingDiscoverySnoozeFingerprint()).toBeNull();
    writePendingDiscoverySnoozeFingerprint("1,2");
    expect(sessionStorage.getItem(PENDING_DISCOVERY_SNOOZE_KEY)).toBe("1,2");
    expect(readPendingDiscoverySnoozeFingerprint()).toBe("1,2");
  });

  it("isPendingDiscoveryModalSnoozed only when fingerprint matches and not forced", () => {
    expect(
      isPendingDiscoveryModalSnoozed({
        forceShow: false,
        snoozeFingerprint: "1,2",
        currentFingerprint: "1,2",
      }),
    ).toBe(true);

    expect(
      isPendingDiscoveryModalSnoozed({
        forceShow: true,
        snoozeFingerprint: "1,2",
        currentFingerprint: "1,2",
      }),
    ).toBe(false);

    expect(
      isPendingDiscoveryModalSnoozed({
        forceShow: false,
        snoozeFingerprint: "1,2",
        currentFingerprint: "1,2,3",
      }),
    ).toBe(false);

    expect(
      isPendingDiscoveryModalSnoozed({
        forceShow: false,
        snoozeFingerprint: "1,2",
        currentFingerprint: "",
      }),
    ).toBe(false);
  });
});
