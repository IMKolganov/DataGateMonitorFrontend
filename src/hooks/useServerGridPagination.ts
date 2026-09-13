import { useCallback, useEffect, useState } from "react";
import type { GridPaginationModel } from "@mui/x-data-grid";
import { clampPage } from "../utils/gridPageSelection";
import { usePersistedPageSize } from "./usePersistedPageSize";
import { useStabilizedRowCount } from "./useStabilizedRowCount";

export type UseServerGridPaginationOptions = {
  storageKey: string;
  defaultPageSize?: number;
  allowedKey?: string;
  pageSizeOptions?: number[];
  /** Raw totalCount from API (before `?? 0`). */
  rowCount: number | null | undefined;
  /** Clears remembered rowCount when dataset identity changes. */
  resetKey?: string | number;
};

export type ServerGridPagination = {
  /** 0-based DataGrid page. */
  page: number;
  /** 1-based API page (`page + 1`). */
  apiPage: number;
  pageSize: number;
  rowCount: number;
  setPage: (page: number) => void;
  resetPage: () => void;
  pageSizeOptions: number[];
  paginationMode: "server";
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  gridProps: {
    paginationMode: "server";
    rowCount: number;
    pageSizeOptions: number[];
    paginationModel: GridPaginationModel;
    onPaginationModelChange: (model: GridPaginationModel) => void;
  };
};

/**
 * Controlled server-side DataGrid pagination with persisted page size.
 * Exposes `apiPage` (1-based) for `Page` query params matching SharedModels canon.
 */
export function useServerGridPagination({
  storageKey,
  defaultPageSize = 10,
  allowedKey = "5,10,20,50,100",
  pageSizeOptions,
  rowCount: rawRowCount,
  resetKey = 0,
}: UseServerGridPaginationOptions): ServerGridPagination {
  const options =
    pageSizeOptions ??
    allowedKey
      .split(",")
      .map((s) => Number.parseInt(s, 10))
      .filter((n) => Number.isFinite(n) && n > 0);

  const [page, setPageState] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize(storageKey, defaultPageSize, allowedKey);
  const rowCount = useStabilizedRowCount(rawRowCount, resetKey);

  const setPage = useCallback(
    (next: number) => {
      setPageState(clampPage(next, rowCount, pageSize));
    },
    [rowCount, pageSize],
  );

  const resetPage = useCallback(() => setPageState(0), []);

  useEffect(() => {
    setPageState((prev) => clampPage(prev, rowCount, pageSize));
  }, [rowCount, pageSize]);

  const onPaginationModelChange = useCallback(
    (model: GridPaginationModel) => {
      if (model.pageSize !== pageSize) {
        setPageSize(model.pageSize);
        setPageState(0);
        return;
      }
      setPageState(clampPage(model.page, rowCount, model.pageSize));
    },
    [pageSize, rowCount, setPageSize],
  );

  const paginationModel: GridPaginationModel = { page, pageSize };

  return {
    page,
    apiPage: page + 1,
    pageSize,
    rowCount,
    setPage,
    resetPage,
    pageSizeOptions: options,
    paginationMode: "server",
    paginationModel,
    onPaginationModelChange,
    gridProps: {
      paginationMode: "server",
      rowCount,
      pageSizeOptions: options,
      paginationModel,
      onPaginationModelChange,
    },
  };
}
