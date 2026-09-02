import { describe, expect, it } from "vitest";
import {
  buildLoginRedirectUrl,
  logoutReasonMessage,
  readLogoutReasonFromSearch,
  type LogoutReason,
} from "./logoutReason";

const ALL_REASONS: LogoutReason[] = [
  "sessionExpired",
  "refreshRejected",
  "missingToken",
  "idleTimeout",
];

describe("logoutReason", () => {
  it("builds login url with reason", () => {
    expect(buildLoginRedirectUrl({ reason: "sessionExpired" })).toBe(
      "/login?reason=sessionExpired",
    );
  });

  it("combines tv redirect with reason", () => {
    expect(
      buildLoginRedirectUrl({
        returnPath: "/tv/link?code=ABC",
        reason: "refreshRejected",
      }),
    ).toBe("/login?redirect=%2Ftv%2Flink%3Fcode%3DABC&reason=refreshRejected");
  });

  it.each(ALL_REASONS)("reads %s from search params", (reason) => {
    expect(readLogoutReasonFromSearch(`?reason=${reason}`)).toBe(reason);
  });

  it("rejects unknown reason values", () => {
    expect(readLogoutReasonFromSearch("?reason=unknown")).toBeNull();
  });

  it("returns distinct human-readable messages for every forced logout reason", () => {
    const messages = ALL_REASONS.map((reason) => logoutReasonMessage(reason));
    const unique = new Set(messages);
    expect(unique.size).toBe(ALL_REASONS.length);
    expect(logoutReasonMessage("idleTimeout")).toMatch(/inactivity/i);
    expect(logoutReasonMessage("sessionExpired")).toMatch(/expired/i);
    expect(logoutReasonMessage("refreshRejected")).toMatch(/no longer valid/i);
    expect(logoutReasonMessage("missingToken")).toMatch(/no active session/i);
  });
});
