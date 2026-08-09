import { describe, expect, it } from "vitest";
import { isCanceledError } from "./queryCanceled";
import { isHttpForbidden, isHttpUnauthorized } from "./httpError";

describe("queryCanceled", () => {
  it("detects CanceledError by name or message", () => {
    expect(isCanceledError({ name: "CanceledError" })).toBe(true);
    expect(isCanceledError(Object.assign(new Error("canceled"), { name: "Error" }))).toBe(true);
    expect(isCanceledError(new Error("other"))).toBe(false);
  });
});

describe("httpError", () => {
  it("returns false for non-axios errors", () => {
    expect(isHttpForbidden(new Error("x"))).toBe(false);
    expect(isHttpUnauthorized({ response: { status: 401 } })).toBe(false);
  });
});
