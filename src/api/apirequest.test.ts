import { describe, expect, it } from "vitest";
import { shouldLogoutOnRefreshError } from "./apirequest";

describe("shouldLogoutOnRefreshError", () => {
  it("returns false for non-objects", () => {
    expect(shouldLogoutOnRefreshError(null)).toBe(false);
    expect(shouldLogoutOnRefreshError("x")).toBe(false);
  });

  it("returns true for missing refresh token and RefreshAuthFailure", () => {
    expect(shouldLogoutOnRefreshError({ message: "No refresh token" })).toBe(true);
    expect(shouldLogoutOnRefreshError({ name: "RefreshAuthFailure" })).toBe(true);
  });

  it("returns true for 401/403 response status", () => {
    expect(shouldLogoutOnRefreshError({ response: { status: 401 } })).toBe(true);
    expect(shouldLogoutOnRefreshError({ response: { status: 403 } })).toBe(true);
    expect(shouldLogoutOnRefreshError({ response: { status: 500 } })).toBe(false);
  });
});
