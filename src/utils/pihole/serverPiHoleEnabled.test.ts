import { describe, expect, it } from "vitest";
import { serverPiHoleEnabled, shouldShowUserDnsQueries } from "./serverPiHoleEnabled";

describe("serverPiHoleEnabled", () => {
  it("returns true when flag is set", () => {
    expect(serverPiHoleEnabled({ isPiHoleEnabled: true })).toBe(true);
  });

  it("returns false when flag is missing or false", () => {
    expect(serverPiHoleEnabled({})).toBe(false);
    expect(serverPiHoleEnabled(null)).toBe(false);
    expect(serverPiHoleEnabled({ isPiHoleEnabled: false })).toBe(false);
  });
});

describe("shouldShowUserDnsQueries", () => {
  it("hides section for non-admins", () => {
    expect(shouldShowUserDnsQueries("ext-1", 5, true, false)).toBe(false);
  });

  it("hides section without externalId", () => {
    expect(shouldShowUserDnsQueries("", 1, true, true)).toBe(false);
    expect(shouldShowUserDnsQueries(null, 1, true, true)).toBe(false);
  });

  it("shows on global user view without server scope", () => {
    expect(shouldShowUserDnsQueries("ext-1", undefined, false, true)).toBe(true);
    expect(shouldShowUserDnsQueries("ext-1", 0, false, true)).toBe(true);
  });

  it("shows on server scope only when Pi-hole enabled", () => {
    expect(shouldShowUserDnsQueries("ext-1", 5, true, true)).toBe(true);
    expect(shouldShowUserDnsQueries("ext-1", 5, false, true)).toBe(false);
  });
});
