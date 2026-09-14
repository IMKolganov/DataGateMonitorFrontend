import { describe, expect, it } from "vitest";
import { formatAccessUserFallback, formatAccessUserLabel } from "./accessUserLabel";

describe("formatAccessUserLabel", () => {
  it("joins display name and email when both exist", () => {
    expect(formatAccessUserLabel({ id: 3, displayName: "Alice", email: "alice@example.com" })).toBe(
      "Alice (alice@example.com)",
    );
  });

  it("falls back to name, email, then id", () => {
    expect(formatAccessUserLabel({ id: 3, displayName: "Alice", email: "  " })).toBe("Alice");
    expect(formatAccessUserLabel({ id: 3, displayName: "", email: "alice@example.com" })).toBe(
      "alice@example.com",
    );
    expect(formatAccessUserLabel({ id: 3, displayName: " ", email: null })).toBe("User #3");
  });
});

describe("formatAccessUserFallback", () => {
  it("renders a numbered placeholder", () => {
    expect(formatAccessUserFallback(8)).toBe("User #8");
    expect(formatAccessUserFallback(null)).toBe("—");
  });
});
