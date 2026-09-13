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

  it("tracks page and pageSize together", () => {
    const { result } = renderHook(() =>
      useClientGridPagination({ storageKey: "test-client", defaultPageSize: 10, allowedKey: "5,10,20" }),
    );

    expect(result.current.paginationModel).toEqual({ page: 0, pageSize: 10 });

    act(() => {
      result.current.onPaginationModelChange({ page: 2, pageSize: 10 });
    });
    expect(result.current.paginationModel).toEqual({ page: 2, pageSize: 10 });

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
  });
});
