import { describe, expect, it } from "vitest";
import {
  buildLoginRedirectUrl,
  logoutReasonMessage,
  readLogoutReasonFromSearch,
} from "./logoutReason";

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

  it("reads reason from search params", () => {
    expect(readLogoutReasonFromSearch("?reason=idleTimeout")).toBe("idleTimeout");
    expect(readLogoutReasonFromSearch("?reason=unknown")).toBeNull();
  });

  it("returns human-readable messages", () => {
    expect(logoutReasonMessage("idleTimeout")).toMatch(/inactivity/i);
    expect(logoutReasonMessage("sessionExpired")).toMatch(/expired/i);
  });
});
