import { describe, expect, it } from "vitest";
import { pickArray } from "./pickPayloadArray";

describe("pickArray", () => {
  it("unwraps common list shapes", () => {
    expect(pickArray({ issuedXrayClientLinks: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(pickArray({ issuedOvpnFiles: [{ id: 2 }] })).toEqual([{ id: 2 }]);
  });

  it("returns empty for nullish or object without arrays", () => {
    expect(pickArray(null)).toEqual([]);
    expect(pickArray({ x: 1 })).toEqual([]);
  });
});
