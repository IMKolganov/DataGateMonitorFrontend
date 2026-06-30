import type { GridColDef } from "@mui/x-data-grid";
import { getUserScopedStorageKey } from "./datagridUserStorage";

const PREFIX = "datagrid-columnWidths";

export type ColumnWidthMap = Record<string, number>;

function storageKey(gridId: string): string {
  return getUserScopedStorageKey(PREFIX, gridId);
}

export function getStoredColumnWidths(gridId: string): ColumnWidthMap {
  try {
    const raw = localStorage.getItem(storageKey(gridId));
    if (raw == null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const result: ColumnWidthMap = {};
    for (const [field, width] of Object.entries(parsed)) {
      const n = typeof width === "number" ? width : Number(width);
      if (Number.isFinite(n) && n > 0) result[field] = n;
    }
    return result;
  } catch {
    return {};
  }
}

export function setStoredColumnWidth(gridId: string, field: string, width: number): void {
  if (!field || !Number.isFinite(width) || width <= 0) return;
  const current = getStoredColumnWidths(gridId);
  current[field] = width;
  try {
    localStorage.setItem(storageKey(gridId), JSON.stringify(current));
  } catch {
    // quota / private mode
  }
}

export function applyStoredColumnWidths(
  columns: readonly GridColDef[],
  widths: ColumnWidthMap,
): GridColDef[] {
  if (columns.length === 0 || Object.keys(widths).length === 0) {
    return [...columns];
  }

  return columns.map((col) => {
    const stored = widths[col.field];
    if (stored == null || !Number.isFinite(stored) || stored <= 0) return col;
    const min = col.minWidth ?? 0;
    const width = Math.max(stored, min);
    const { flex: _flex, ...rest } = col;
    return { ...rest, width };
  });
}
