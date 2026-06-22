import { describe, expect, it } from "vitest";
import { isNonAdminBlockedSubpath, isXrayBlockedSubpath } from "./serverDetailsPaths";

describe("serverDetailsPaths", () => {
  it("blocks Xray-only subpaths", () => {
    expect(isXrayBlockedSubpath("pi-hole")).toBe(true);
    expect(isXrayBlockedSubpath("console/extra")).toBe(true);
    expect(isXrayBlockedSubpath("statistics")).toBe(false);
  });

  it("blocks admin-only subpaths for non-admin redirect", () => {
    expect(isNonAdminBlockedSubpath("")).toBe(true);
    expect(isNonAdminBlockedSubpath("pi-hole")).toBe(true);
    expect(isNonAdminBlockedSubpath("certificates")).toBe(true);
    expect(isNonAdminBlockedSubpath("statistics")).toBe(false);
  });
});
