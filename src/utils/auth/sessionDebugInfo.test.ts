import { describe, expect, it } from "vitest";
import { formatSessionDebugLine } from "./sessionDebugInfo";

describe("formatSessionDebugLine", () => {
  const now = 1_700_000_000_000;

  it("shows JWT, idle, and refresh countdowns", () => {
    const line = formatSessionDebugLine(
      {
        jwtRemainingMs: 90_000,
        idleLogoutAtMs: now + 600_000,
        refreshExpiresAtMs: now + 3 * 24 * 60 * 60_000,
        idleWarningActive: false,
      },
      now,
    );

    expect(line).toMatch(/JWT 1:30/);
    expect(line).toMatch(/Idle 10:00/);
    expect(line).toMatch(/Refresh 3d/);
  });

  it("marks idle warning phase", () => {
    const line = formatSessionDebugLine(
      {
        jwtRemainingMs: 30_000,
        idleLogoutAtMs: now + 45_000,
        refreshExpiresAtMs: null,
        idleWarningActive: true,
      },
      now,
    );

    expect(line).toContain("Idle⚠");
    expect(line).toMatch(/0:45/);
  });

  it("shows placeholders when timers are unavailable", () => {
    expect(
      formatSessionDebugLine(
        {
          jwtRemainingMs: null,
          idleLogoutAtMs: null,
          refreshExpiresAtMs: null,
          idleWarningActive: false,
        },
        now,
      ),
    ).toBe("JWT —");
  });
});
