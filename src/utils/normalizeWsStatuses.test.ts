import { describe, expect, it } from "vitest";
import { normalizeWsStatuses } from "./normalizeWsStatuses";

describe("normalizeWsStatuses", () => {
  it("returns empty object for non-arrays", () => {
    expect(normalizeWsStatuses(null)).toEqual({});
    expect(normalizeWsStatuses({ vpnServerId: 1 })).toEqual({});
  });

  it("maps flat status payloads to ServiceEntry", () => {
    const result = normalizeWsStatuses([{ vpnServerId: 1, status: 1, nextRunTime: "soon" }]);
    expect(result[1]?.status).toBe("Running");
    expect(result[1]?.nextRunTime).toBe("soon");
  });

  it("unwraps ServiceStatus wrappers", () => {
    const result = normalizeWsStatuses([
      { ServiceStatus: { VpnServerId: 7, Status: 2, ErrorMessage: "x" } },
    ]);
    expect(result[7]?.status).toBe("Error");
    expect(result[7]?.errorMessage).toBe("x");
  });
});
