import { describe, expect, it, vi } from "vitest";

vi.mock("jwt-decode", () => ({
  jwtDecode: () => ({ exp: Math.floor(Date.now() / 1000) + 90 }),
}));

import { formatRemainingTime, getTokenRemainingMs } from "./tokenExpiration";

describe("tokenExpiration", () => {
  it("formats remaining time and expired", () => {
    expect(formatRemainingTime(0)).toBe("expired");
    expect(formatRemainingTime(65_000)).toBe("1:05");
  });

  it("computes remaining ms from jwt exp", () => {
    expect(getTokenRemainingMs("tok")).toBeGreaterThan(0);
  });
});
