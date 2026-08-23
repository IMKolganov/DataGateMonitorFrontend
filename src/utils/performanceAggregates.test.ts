import { describe, expect, it } from "vitest";
import { buildTopSlow, formatSqlForDisplay, stripQuery } from "./performanceAggregates";

describe("stripQuery", () => {
  it("removes query string", () => {
    expect(stripQuery("/api/servers?x=1")).toBe("/api/servers");
  });
});

describe("formatSqlForDisplay", () => {
  it("breaks major clauses onto new lines", () => {
    const out = formatSqlForDisplay("SELECT * FROM vpn_servers WHERE id = 1 AND active = true");
    expect(out).toContain("\nFROM ");
    expect(out).toContain("\nWHERE ");
    expect(out).toContain("\n  AND ");
  });

  it("keeps already multi-line SQL", () => {
    const sql = "SELECT *\nFROM vpn_servers\nWHERE id = 1";
    expect(formatSqlForDisplay(sql)).toBe(sql);
  });
});

describe("buildTopSlow", () => {
  it("aggregates by key and respects take", () => {
    const items = [
      { key: "a", label: "a", durationMs: 10 },
      { key: "b", label: "b", durationMs: 50 },
      { key: "a", label: "a", durationMs: 40 },
      { key: "c", label: "c", durationMs: 30 },
    ];
    const top = buildTopSlow(items, 2);
    expect(top).toHaveLength(2);
    expect(top[0].key).toBe("b");
    expect(top[1].key).toBe("a");
    expect(top[1].maxDurationMs).toBe(40);
    expect(top[1].samples).toBe(2);
  });
});
