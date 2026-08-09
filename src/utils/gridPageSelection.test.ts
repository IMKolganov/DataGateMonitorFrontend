import { describe, expect, it } from "vitest";
import type { GridRowSelectionModel } from "@mui/x-data-grid";
import {
  clampPage,
  collectSelectedOnPage,
  emptyGridSelection,
  slicePageRows,
  stabilizeRowCount,
} from "./gridPageSelection";

type Row = { id: string; active: boolean };

const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: `r${i}`,
  active: i % 3 !== 0, // r0,r3,r6,r9 inactive
}));

describe("slicePageRows", () => {
  it("returns the current page slice", () => {
    expect(slicePageRows(rows, 0, 5).map((r) => r.id)).toEqual(["r0", "r1", "r2", "r3", "r4"]);
    expect(slicePageRows(rows, 1, 5).map((r) => r.id)).toEqual(["r5", "r6", "r7", "r8", "r9"]);
    expect(slicePageRows(rows, 2, 5).map((r) => r.id)).toEqual(["r10", "r11"]);
  });

  it("guards invalid page/pageSize", () => {
    expect(slicePageRows(rows, -1, 5)).toHaveLength(5);
    expect(slicePageRows(rows, 0, 0)).toHaveLength(1);
  });
});

describe("collectSelectedOnPage", () => {
  const page0 = slicePageRows(rows, 0, 5);
  const isEligible = (row: Row) => row.active;

  it("include model only keeps eligible ids on the current page", () => {
    const selection: GridRowSelectionModel = {
      type: "include",
      ids: new Set(["r1", "r4", "r7", "r0"]),
    };
    expect(collectSelectedOnPage(selection, page0, isEligible).map((r) => r.id)).toEqual([
      "r1",
      "r4",
    ]);
  });

  it("exclude model (select-all) only returns eligible rows on the current page", () => {
    const selection: GridRowSelectionModel = { type: "exclude", ids: new Set() };
    // page0: r0 inactive, r1 active, r2 active, r3 inactive, r4 active
    expect(collectSelectedOnPage(selection, page0, isEligible).map((r) => r.id)).toEqual([
      "r1",
      "r2",
      "r4",
    ]);
  });

  it("exclude model respects unchecked ids on the page", () => {
    const selection: GridRowSelectionModel = { type: "exclude", ids: new Set(["r2"]) };
    expect(collectSelectedOnPage(selection, page0, isEligible).map((r) => r.id)).toEqual([
      "r1",
      "r4",
    ]);
  });

  it("does not leak off-page rows even if include ids contain them", () => {
    const selection: GridRowSelectionModel = {
      type: "include",
      ids: new Set(rows.map((r) => r.id)),
    };
    expect(collectSelectedOnPage(selection, page0, isEligible)).toHaveLength(3);
  });
});

describe("emptyGridSelection", () => {
  it("returns an empty include model", () => {
    const selection = emptyGridSelection();
    expect(selection.type).toBe("include");
    expect(selection.ids.size).toBe(0);
  });
});

describe("stabilizeRowCount", () => {
  it("keeps previous when next is missing or invalid", () => {
    expect(stabilizeRowCount(40, undefined)).toBe(40);
    expect(stabilizeRowCount(40, null)).toBe(40);
    expect(stabilizeRowCount(40, Number.NaN)).toBe(40);
  });

  it("accepts a finite non-negative next count including zero", () => {
    expect(stabilizeRowCount(40, 0)).toBe(0);
    expect(stabilizeRowCount(40, 12)).toBe(12);
  });
});

describe("clampPage", () => {
  it("clamps into the last valid page", () => {
    expect(clampPage(9, 23, 10)).toBe(2);
    expect(clampPage(-3, 23, 10)).toBe(0);
    expect(clampPage(0, 0, 10)).toBe(0);
  });
});
