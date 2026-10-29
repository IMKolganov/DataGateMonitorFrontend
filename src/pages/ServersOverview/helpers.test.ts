import { describe, expect, it } from "vitest";
import { computeSeriesExtremes, extremeFromSummary } from "./helpers";

describe("extremeFromSummary", () => {
  it("maps count + ISO timestamp into a labeled extreme", () => {
    const extreme = extremeFromSummary(38, "2026-09-28T18:00:00.000Z", "hours");
    expect(extreme).not.toBeNull();
    expect(extreme!.count).toBe(38);
    expect(extreme!.at.toISOString()).toBe("2026-09-28T18:00:00.000Z");
    expect(extreme!.atLabel.length).toBeGreaterThan(0);
  });

  it("returns null when count or timestamp is missing/invalid", () => {
    expect(extremeFromSummary(undefined, "2026-09-28T18:00:00.000Z", "hours")).toBeNull();
    expect(extremeFromSummary(10, null, "hours")).toBeNull();
    expect(extremeFromSummary(10, "", "hours")).toBeNull();
    expect(extremeFromSummary(Number.NaN, "2026-09-28T18:00:00.000Z", "hours")).toBeNull();
    expect(extremeFromSummary(10, "not-a-date", "hours")).toBeNull();
  });

  it("allows zero as a valid concurrent low", () => {
    const extreme = extremeFromSummary(0, "2026-09-28T03:00:00.000Z", "hours");
    expect(extreme).not.toBeNull();
    expect(extreme!.count).toBe(0);
  });
});

describe("computeSeriesExtremes (legacy fallback)", () => {
  it("skips future buckets when computing peak/low", () => {
    const now = new Date("2026-09-28T12:00:00.000Z");
    const result = computeSeriesExtremes(
      [
        { ts: "2026-09-28T03:00:00.000Z", value: 11 },
        { ts: "2026-09-28T10:00:00.000Z", value: 40 },
        { ts: "2026-09-28T18:00:00.000Z", value: 99 }, // future relative to now
      ],
      "hours",
      now,
    );

    expect(result.peak?.count).toBe(40);
    expect(result.low?.count).toBe(11);
  });
});
