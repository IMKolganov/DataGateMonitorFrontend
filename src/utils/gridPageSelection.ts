import type { GridRowId, GridRowSelectionModel } from "@mui/x-data-grid";

export function emptyGridSelection(): GridRowSelectionModel {
  return { type: "include", ids: new Set() };
}

/** Client-side page slice used by DataGrid `paginationMode="client"`. */
export function slicePageRows<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 0;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 1;
  const start = safePage * safeSize;
  return rows.slice(start, start + safeSize);
}

/**
 * Collect eligible selected rows that are visible on the current page.
 * Prevents bulk actions from applying to off-page rows when select-all uses
 * an exclude model (community DataGrid cannot force visible-only select-all).
 */
export function collectSelectedOnPage<T extends { id: GridRowId }>(
  selection: GridRowSelectionModel,
  pageRows: readonly T[],
  isEligible: (row: T) => boolean,
): T[] {
  if (selection.type === "exclude") {
    return pageRows.filter((row) => isEligible(row) && !selection.ids.has(row.id));
  }

  const pageIds = new Set(pageRows.map((row) => String(row.id)));
  const byId = new Map(pageRows.map((row) => [String(row.id), row]));
  const selected: T[] = [];
  for (const id of selection.ids) {
    if (!pageIds.has(String(id))) continue;
    const row = byId.get(String(id));
    if (row && isEligible(row)) selected.push(row);
  }
  return selected;
}

/**
 * Keep the last known server `rowCount` while a page fetch returns undefined/0 briefly,
 * so MUI DataGrid does not snap pagination back to page 0.
 */
export function stabilizeRowCount(previous: number, next: number | undefined | null): number {
  if (typeof next === "number" && Number.isFinite(next) && next >= 0) return next;
  return Math.max(0, previous);
}

/** Clamp a 0-based page index into the valid range for the given totals. */
export function clampPage(page: number, rowCount: number, pageSize: number): number {
  const size = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 1;
  const count = Number.isFinite(rowCount) && rowCount > 0 ? Math.floor(rowCount) : 0;
  const maxPage = Math.max(0, Math.ceil(count / size) - 1);
  const safePage = Number.isFinite(page) ? Math.floor(page) : 0;
  return Math.min(Math.max(0, safePage), maxPage);
}
