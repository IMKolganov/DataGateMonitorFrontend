import { describe, expect, it } from "vitest";
import { buildTopSlow, stripQuery } from "./performanceAggregates";

describe("performanceAggregates", () => {
  it("stripQuery removes query string", () => {
    expect(stripQuery("/api/x?a=1")).toBe("/api/x");
    expect(stripQuery("/api/x")).toBe("/api/x");
  });

  it("buildTopSlow ranks by max duration and caps take", () => {
    const top = buildTopSlow(
      [
        { key: "GET /a", label: "GET /a", durationMs: 100 },
        { key: "GET /a", label: "GET /a", durationMs: 400 },
        { key: "POST /b", label: "POST /b", durationMs: 300 },
        { key: "GET /c", label: "GET /c", durationMs: 50 },
      ],
      2,
    );

    expect(top).toHaveLength(2);
    expect(top[0]).toMatchObject({ key: "GET /a", maxDurationMs: 400, samples: 2 });
    expect(top[1]).toMatchObject({ key: "POST /b", maxDurationMs: 300, samples: 1 });
  });
});
