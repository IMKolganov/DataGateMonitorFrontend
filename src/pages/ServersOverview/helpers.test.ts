import { describe, expect, it } from "vitest";
import {
  addDays,
  formatBytes,
  mergeChartWithUsersSeries,
  normalizeGrouping,
  toChartPoints,
  toUsersSeriesChartPoints,
} from "./helpers";

describe("ServersOverview helpers", () => {
  it("normalizes grouping and formats bytes", () => {
    expect(normalizeGrouping("hours")).toBe("hours");
    expect(normalizeGrouping("nope")).toBe("days");
    expect(formatBytes(1536)).toMatch(/KB/);
    expect(formatBytes(Number.NaN)).toBe("-");
  });

  it("adds days without mutating original", () => {
    const d = new Date("2024-01-10T12:00:00Z");
    const next = addDays(d, 2);
    expect(next.getUTCDate()).toBe(12);
    expect(d.getUTCDate()).toBe(10);
  });

  it("maps series rows to chart points and merges users series", () => {
    const points = toChartPoints(
      [
        {
          ts: "2024-01-01T00:00:00Z",
          trafficInBytes: 1024 * 1024,
          trafficOutBytes: 1024 * 1024,
          activeClients: 3,
        },
      ],
      "days",
    );
    expect(points).toHaveLength(1);
    expect(points[0]!.active).toBe(3);
    expect(points[0]!.mb).toBe(2);

    const users = toUsersSeriesChartPoints(
      [{ ts: "2024-01-01T00:00:00Z", activeUsers: 7 }],
      "days",
    );
    const merged = mergeChartWithUsersSeries(points, users);
    expect(merged[0]).toMatchObject({ active: 3 });
    expect((merged[0] as { activeUsers?: number }).activeUsers ?? users[0]!.activeUsers).toBe(7);
  });
});
