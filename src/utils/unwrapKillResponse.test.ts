import { describe, expect, it } from "vitest";
import { unwrapKillResponse } from "./unwrapKillResponse";

describe("unwrapKillResponse", () => {
  it("unwraps envelope data or returns payload as-is", () => {
    expect(unwrapKillResponse(null)).toBeUndefined();
    expect(unwrapKillResponse({ data: { success: true } })).toEqual({ success: true });
    expect(unwrapKillResponse({ success: false, message: "x" })).toMatchObject({
      success: false,
      message: "x",
    });
  });
});
