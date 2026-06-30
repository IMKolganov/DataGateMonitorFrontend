import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GridColDef } from "@mui/x-data-grid";
import {
  applyStoredColumnWidths,
  getStoredColumnWidths,
  setStoredColumnWidth,
} from "./gridColumnWidths";

vi.mock("./auth/authSelectors", () => ({
  getCurrentUser: vi.fn(() => ({ id: 42 })),
}));

import { getCurrentUser } from "./auth/authSelectors";

const GRID_ID = "test-grid";

describe("gridColumnWidths", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getCurrentUser).mockReturnValue({ id: 42 });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns empty map when nothing is stored", () => {
    expect(getStoredColumnWidths(GRID_ID)).toEqual({});
  });

  it("persists column width per user and grid", () => {
    setStoredColumnWidth(GRID_ID, "email", 240);
    expect(getStoredColumnWidths(GRID_ID)).toEqual({ email: 240 });
    expect(localStorage.getItem("datagrid-columnWidths:42:test-grid")).toBe(
      JSON.stringify({ email: 240 }),
    );
  });

  it("scopes storage by user id", () => {
    setStoredColumnWidth(GRID_ID, "name", 180);

    vi.mocked(getCurrentUser).mockReturnValue({ id: 7 });
    expect(getStoredColumnWidths(GRID_ID)).toEqual({});

    vi.mocked(getCurrentUser).mockReturnValue({ id: 42 });
    expect(getStoredColumnWidths(GRID_ID)).toEqual({ name: 180 });
  });

  it("merges stored widths into columns and drops flex", () => {
    const columns: GridColDef[] = [
      { field: "id", headerName: "ID", width: 70 },
      { field: "email", headerName: "Email", flex: 1, minWidth: 120 },
    ];

    const merged = applyStoredColumnWidths(columns, { email: 200 });

    expect(merged[0]).toEqual(columns[0]);
    expect(merged[1]).toEqual({
      field: "email",
      headerName: "Email",
      minWidth: 120,
      width: 200,
    });
    expect(merged[1]).not.toHaveProperty("flex");
  });

  it("respects column minWidth when applying stored width", () => {
    const columns: GridColDef[] = [{ field: "name", headerName: "Name", flex: 1, minWidth: 150 }];
    const merged = applyStoredColumnWidths(columns, { name: 80 });
    expect(merged[0].width).toBe(150);
  });

  it("ignores invalid stored widths", () => {
    localStorage.setItem("datagrid-columnWidths:42:test-grid", JSON.stringify({ bad: -5 }));
    expect(getStoredColumnWidths(GRID_ID)).toEqual({});
  });
});
