import { useCallback, useState } from "react";
import type { GridPaginationModel } from "@mui/x-data-grid";
import { usePersistedPageSize } from "./usePersistedPageSize";

export type UseClientGridPaginationOptions = {
  /** localStorage key for rows-per-page (scoped per user). */
  storageKey: string;
  defaultPageSize?: number;
  /** Stable comma-separated options, e.g. `"5,10,20,50"`. */
  allowedKey?: string;
  pageSizeOptions?: number[];
};

export type ClientGridPagination = {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  resetPage: () => void;
  pageSizeOptions: number[];
  paginationMode: "client";
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  /** Spread onto MUI DataGrid / TableStyle Grid. */
  gridProps: {
    paginationMode: "client";
    pageSizeOptions: number[];
    paginationModel: GridPaginationModel;
    onPaginationModelChange: (model: GridPaginationModel) => void;
  };
};

/**
 * Controlled client-side DataGrid pagination with persisted page size.
 * Always tracks both `page` and `pageSize` so next/prev cannot stick at 0.
 */
export function useClientGridPagination({
  storageKey,
  defaultPageSize = 10,
  allowedKey = "5,10,20,50",
  pageSizeOptions,
}: UseClientGridPaginationOptions): ClientGridPagination {
  const options =
    pageSizeOptions ??
    allowedKey
      .split(",")
      .map((s) => Number.parseInt(s, 10))
      .filter((n) => Number.isFinite(n) && n > 0);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize(storageKey, defaultPageSize, allowedKey);

  const onPaginationModelChange = useCallback(
    (model: GridPaginationModel) => {
      if (model.pageSize !== pageSize) {
        setPageSize(model.pageSize);
        setPage(0);
        return;
      }
      setPage(model.page);
    },
    [pageSize, setPageSize],
  );

  const resetPage = useCallback(() => setPage(0), []);

  const paginationModel: GridPaginationModel = { page, pageSize };

  return {
    page,
    pageSize,
    setPage,
    resetPage,
    pageSizeOptions: options,
    paginationMode: "client",
    paginationModel,
    onPaginationModelChange,
    gridProps: {
      paginationMode: "client",
      pageSizeOptions: options,
      paginationModel,
      onPaginationModelChange,
    },
  };
}
