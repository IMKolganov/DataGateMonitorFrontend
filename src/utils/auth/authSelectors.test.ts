import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getCurrentUser, isAdmin, isAuthenticated } from "./authSelectors";
import { ACCESS_TOKEN_KEY } from "../const";
import { SystemRoles } from "../../constants/systemRoles";

function makeJwt(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${header}.${payload}.sig`;
}

describe("authSelectors", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns null without token", () => {
    expect(getCurrentUser()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it("isAuthenticated is true when access token is stored", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "tok");
    expect(isAuthenticated()).toBe(true);
  });

  it("decodes user id, email and admin role from JWT", () => {
    const token = makeJwt({
      nameid: "42",
      email: "admin@example.com",
      displayName: "Admin",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": SystemRoles.Admin,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    localStorage.setItem(ACCESS_TOKEN_KEY, token);

    const user = getCurrentUser();
    expect(user?.id).toBe(42);
    expect(user?.email).toBe("admin@example.com");
    expect(isAdmin(user)).toBe(true);
  });

  it("isAdmin is false for non-admin roles", () => {
    expect(isAdmin({ id: 1, role: SystemRoles.VpnUser })).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});
