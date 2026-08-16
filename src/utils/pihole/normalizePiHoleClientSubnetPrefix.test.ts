import { describe, expect, it } from "vitest";
import {
  normalizePiHoleClientSubnetPrefix,
  piHoleClientSubnetPrefixesEqual,
} from "./normalizePiHoleClientSubnetPrefix";

describe("normalizePiHoleClientSubnetPrefix", () => {
  it("appends trailing dot for IPv4 dotted prefixes", () => {
    expect(normalizePiHoleClientSubnetPrefix("10.80.0")).toBe("10.80.0.");
    expect(normalizePiHoleClientSubnetPrefix(" 10.80.0. ")).toBe("10.80.0.");
    expect(normalizePiHoleClientSubnetPrefix("10.51.15.")).toBe("10.51.15.");
  });

  it("treats 10.80.0 and 10.80.0. as equal", () => {
    expect(piHoleClientSubnetPrefixesEqual("10.80.0", "10.80.0.")).toBe(true);
    expect(piHoleClientSubnetPrefixesEqual("10.80.0", "10.80.1.")).toBe(false);
  });
});
