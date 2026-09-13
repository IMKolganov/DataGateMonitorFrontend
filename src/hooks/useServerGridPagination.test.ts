import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/auth/authSelectors", () => ({
  getCurrentUser: vi.fn(() => ({ id: 7 })),
}));

import { useServerGridPagination } from "./useServerGridPagination";

describe("useServerGridPagination", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("exposes 1-based apiPage for SharedModels Page", () => {
    const { result } = renderHook(() =>
      useServerGridPagination({
        storageKey: "test-server",
        defaultPageSize: 10,
        allowedKey: "5,10,20",
        rowCount: 45,
      }),
    );

    expect(result.current.apiPage).toBe(1);

    act(() => {
      result.current.onPaginationModelChange({ page: 2, pageSize: 10 });
    });
    expect(result.current.page).toBe(2);
    expect(result.current.apiPage).toBe(3);
  });

  it("resets page when pageSize changes", () => {
    const { result } = renderHook(() =>
      useServerGridPagination({
        storageKey: "test-server-size",
        allowedKey: "10,20",
        rowCount: 100,
      }),
    );

    act(() => {
      result.current.onPaginationModelChange({ page: 3, pageSize: 10 });
    });
    act(() => {
      result.current.onPaginationModelChange({ page: 3, pageSize: 20 });
    });
    expect(result.current.paginationModel).toEqual({ page: 0, pageSize: 20 });
  });
});
