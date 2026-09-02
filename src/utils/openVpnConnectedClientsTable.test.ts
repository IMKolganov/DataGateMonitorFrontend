import { describe, expect, it } from "vitest";
import {
  hasConnectedClientFilterParams,
  shouldServeConnectedTableFromMapFetch,
  sliceConnectedClientsTablePage,
} from "./openVpnConnectedClientsTable";

describe("openVpnConnectedClientsTable", () => {
  it("detects active connected-client filters", () => {
    expect(hasConnectedClientFilterParams({})).toBe(false);
    expect(hasConnectedClientFilterParams({ Search: "  " })).toBe(false);
    expect(hasConnectedClientFilterParams({ CommonName: "cn-1" })).toBe(true);
  });

  it("uses map fetch for live page zero without filters", () => {
    expect(shouldServeConnectedTableFromMapFetch(true, 0, {})).toBe(true);
    expect(shouldServeConnectedTableFromMapFetch(true, 1, {})).toBe(false);
    expect(shouldServeConnectedTableFromMapFetch(false, 0, {})).toBe(false);
    expect(shouldServeConnectedTableFromMapFetch(true, 0, { Search: "x" })).toBe(false);
  });

  it("slices map payload for the first table page", () => {
    const sliced = sliceConnectedClientsTablePage(
      {
        totalCount: 42,
        vpnClients: [{ id: 1 }, { id: 2 }, { id: 3 }],
      },
      2,
    );

    expect(sliced?.vpnClients).toHaveLength(2);
    expect(sliced?.totalCount).toBe(42);
  });
});
