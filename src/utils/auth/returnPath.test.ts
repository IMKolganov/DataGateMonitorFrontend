import { describe, expect, it } from "vitest";
import { loginUrlWithReturn, readRedirectFromSearch, sanitizeReturnPath } from "./returnPath";

describe("returnPath", () => {
  it("blocks open redirects", () => {
    expect(sanitizeReturnPath("//evil.com")).toBe("/");
    expect(sanitizeReturnPath("https://evil.com")).toBe("/");
  });

  it("builds login url with encoded redirect", () => {
    expect(loginUrlWithReturn("/servers")).toBe("/login?redirect=%2Fservers");
  });

  it("reads redirect from search params", () => {
    expect(readRedirectFromSearch("?redirect=%2Ftv%2Flink")).toBe("/tv/link");
  });
});
