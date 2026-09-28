import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/auth/authSelectors", () => ({
  getCurrentUser: vi.fn(() => ({ id: 7 })),
}));

import { useClientGridPagination } from "./useClientGridPagination";

describe("useClientGridPagination", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("tracks page and pageSize together so next/prev cannot stick at 0", () => {
    const { result } = renderHook(() =>
      useClientGridPagination({ storageKey: "test-client", defaultPageSize: 10, allowedKey: "5,10,20" }),
    );

    expect(result.current.paginationModel).toEqual({ page: 0, pageSize: 10 });

    act(() => {
      result.current.onPaginationModelChange({ page: 2, pageSize: 10 });
    });
    expect(result.current.paginationModel).toEqual({ page: 2, pageSize: 10 });
    expect(result.current.page).toBe(2);

    act(() => {
      result.current.onPaginationModelChange({ page: 2, pageSize: 20 });
    });
    expect(result.current.paginationModel).toEqual({ page: 0, pageSize: 20 });
  });

  it("exposes gridProps for DataGrid", () => {
    const { result } = renderHook(() =>
      useClientGridPagination({ storageKey: "test-client-props", allowedKey: "5,10" }),
    );
    expect(result.current.gridProps.paginationMode).toBe("client");
    expect(result.current.gridProps.pageSizeOptions).toEqual([5, 10]);
    expect(result.current.gridProps.paginationModel).toEqual(result.current.paginationModel);
  });

  it("resetPage returns to the first page without changing pageSize", () => {
    const { result } = renderHook(() =>
      useClientGridPagination({ storageKey: "test-client-reset", allowedKey: "10,20" }),
    );

    act(() => {
      result.current.onPaginationModelChange({ page: 3, pageSize: 10 });
    });
    act(() => {
      result.current.resetPage();
    });
    expect(result.current.paginationModel).toEqual({ page: 0, pageSize: 10 });
  });

  it("setPage updates the controlled page index", () => {
    const { result } = renderHook(() =>
      useClientGridPagination({ storageKey: "test-client-set", allowedKey: "10,20" }),
    );

    act(() => {
      result.current.setPage(4);
    });
    expect(result.current.page).toBe(4);
    expect(result.current.paginationModel.page).toBe(4);
  });

  it("persists pageSize across remounts for the same storageKey", () => {
    const { result, unmount } = renderHook(() =>
      useClientGridPagination({ storageKey: "test-client-persist", defaultPageSize: 10, allowedKey: "5,10,20" }),
    );

    act(() => {
      result.current.onPaginationModelChange({ page: 0, pageSize: 20 });
    });
    unmount();

    const { result: remounted } = renderHook(() =>
      useClientGridPagination({ storageKey: "test-client-persist", defaultPageSize: 10, allowedKey: "5,10,20" }),
    );
    expect(remounted.current.pageSize).toBe(20);
    expect(remounted.current.page).toBe(0);
  });

  it("honors explicit pageSizeOptions over allowedKey parsing", () => {
    const { result } = renderHook(() =>
      useClientGridPagination({
        storageKey: "test-client-opts",
        allowedKey: "5,10",
        pageSizeOptions: [10, 50],
      }),
    );
    expect(result.current.pageSizeOptions).toEqual([10, 50]);
    expect(result.current.gridProps.pageSizeOptions).toEqual([10, 50]);
  });
});
