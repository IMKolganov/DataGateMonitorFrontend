import { describe, expect, it } from "vitest";
import { avatarBackgroundStyle, initialsFromLabel, stringHue } from "./avatarVisual";

describe("avatarVisual", () => {
  it("builds initials from labels", () => {
    expect(initialsFromLabel("Ada Lovelace")).toBe("AL");
    expect(initialsFromLabel("")).toBe("?");
    expect(initialsFromLabel("solo")).toBe("SO");
  });

  it("returns deterministic hue and gradient style", () => {
    expect(stringHue("seed")).toBe(stringHue("seed"));
    expect(avatarBackgroundStyle("x").background).toMatch(/linear-gradient/);
  });
});
