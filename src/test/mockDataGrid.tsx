import React, { useState } from "react";
import { vi } from "vitest";
import type { GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";

type AnyRow = { id?: string | number; [key: string]: unknown };

export type MockGridProps = {
  rows?: AnyRow[];
  rowCount?: number;
  paginationMode?: "client" | "server";
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (model: GridPaginationModel) => void;
  pageSizeOptions?: number[];
  loading?: boolean;
  localeText?: { noRowsLabel?: string };
  rowSelectionModel?: GridRowSelectionModel;
  onRowSelectionModelChange?: (model: GridRowSelectionModel) => void;
  isRowSelectable?: (params: { row: AnyRow }) => boolean;
  initialState?: { pagination?: { paginationModel?: GridPaginationModel } };
  columns?: unknown[];
  getRowId?: (row: AnyRow) => string | number;
};

/** Lightweight DataGrid stand-in for pagination RTL tests. */
export function MockDataGrid(props: MockGridProps) {
  const initialPageSize =
    props.paginationModel?.pageSize ??
    props.initialState?.pagination?.paginationModel?.pageSize ??
    props.pageSizeOptions?.[0] ??
    10;
  const initialPage = props.paginationModel?.page ?? 0;

  const [uncontrolled, setUncontrolled] = useState<GridPaginationModel>({
    page: initialPage,
    pageSize: initialPageSize,
  });

  const controlled = props.paginationModel != null;
  const pageSize = controlled ? (props.paginationModel!.pageSize ?? initialPageSize) : uncontrolled.pageSize;
  const page = controlled ? (props.paginationModel!.page ?? 0) : uncontrolled.page;

  const setModel = (model: GridPaginationModel) => {
    if (props.onPaginationModelChange) {
      props.onPaginationModelChange(model);
    }
    if (!controlled) {
      setUncontrolled(model);
    }
  };

  const allRows = props.rows ?? [];
  const visibleRows =
    props.paginationMode === "server"
      ? allRows
      : allRows.slice(page * pageSize, page * pageSize + pageSize);

  const getId = (row: AnyRow, index: number) => {
    if (props.getRowId) return props.getRowId(row);
    return row.id ?? index;
  };

  return (
    <div
      data-testid="mock-grid"
      data-pagination-mode={props.paginationMode ?? "client"}
      data-page={String(page)}
      data-page-size={String(pageSize)}
      data-row-count={String(props.rowCount ?? allRows.length)}
      data-loading={props.loading ? "true" : "false"}
      data-page-size-options={(props.pageSizeOptions ?? []).join(",")}
    >
      <button
        type="button"
        data-testid="next-page"
        onClick={() => setModel({ page: page + 1, pageSize })}
      >
        Next page
      </button>
      <button
        type="button"
        data-testid="set-page-size-20"
        onClick={() => setModel({ page: 0, pageSize: 20 })}
      >
        Page size 20
      </button>
      <ul data-testid="grid-rows">
        {visibleRows.map((row, index) => {
          const id = getId(row, index);
          const label =
            (row.commonName as string | undefined) ??
            (row.displayName as string | undefined) ??
            (row.email as string | undefined) ??
            (row.name as string | undefined) ??
            (row.title as string | undefined) ??
            (row.eventType as string | undefined) ??
            (row.messageText as string | undefined) ??
            (row.username as string | undefined) ??
            (row.clientId as string | undefined) ??
            (row.appProcess as string | undefined) ??
            (row.text as string | undefined) ??
            String(id);
          return (
            <li key={String(id)} data-testid={`row-${id}`}>
              {label}
            </li>
          );
        })}
      </ul>
      {allRows.length === 0 && props.localeText?.noRowsLabel ? (
        <div data-testid="no-rows">{props.localeText.noRowsLabel}</div>
      ) : null}
    </div>
  );
}

export const themeProviderMock = {
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
};

export function persistedPageSizeMock(pageSize = 5) {
  return {
    usePersistedPageSize: () => [pageSize, vi.fn()] as [number, (n: number) => void],
  };
}
