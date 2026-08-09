import { describe, expect, it } from "vitest";
import { pickArray } from "./pickPayloadArray";

describe("pickArray", () => {
  it("unwraps common list shapes", () => {
    expect(pickArray({ items: [1, 2] })).toEqual([1, 2]);
    expect(pickArray({ data: [{ a: 1 }] })).toEqual([{ a: 1 }]);
    expect(pickArray([9])).toEqual([9]);
  });

  it("returns empty for nullish or object without arrays", () => {
    expect(pickArray(null)).toEqual([]);
    expect(pickArray({ x: 1 })).toEqual([]);
  });
});
