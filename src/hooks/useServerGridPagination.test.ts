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
    expect(result.current.paginationMode).toBe("server");
    expect(result.current.gridProps.rowCount).toBe(45);

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
    expect(result.current.apiPage).toBe(1);
  });

  it("resetPage returns to page 0", () => {
    const { result } = renderHook(() =>
      useServerGridPagination({
        storageKey: "test-server-reset",
        allowedKey: "10,20",
        rowCount: 100,
      }),
    );

    act(() => {
      result.current.onPaginationModelChange({ page: 4, pageSize: 10 });
    });
    act(() => {
      result.current.resetPage();
    });
    expect(result.current.page).toBe(0);
    expect(result.current.apiPage).toBe(1);
  });

  it("clamps page when rowCount shrinks", () => {
    const { result, rerender } = renderHook(
      ({ rowCount }) =>
        useServerGridPagination({
          storageKey: "test-server-clamp",
          allowedKey: "10,20",
          rowCount,
        }),
      { initialProps: { rowCount: 100 } },
    );

    act(() => {
      result.current.onPaginationModelChange({ page: 9, pageSize: 10 });
    });
    expect(result.current.page).toBe(9);

    rerender({ rowCount: 25 });
    expect(result.current.page).toBe(2);
    expect(result.current.apiPage).toBe(3);
  });

  it("resets page to 0 when resetKey changes (filter / dataset identity)", () => {
    const { result, rerender } = renderHook(
      ({ resetKey, rowCount }) =>
        useServerGridPagination({
          storageKey: "test-server-reset-key",
          allowedKey: "10,20",
          rowCount,
          resetKey,
        }),
      { initialProps: { resetKey: "server:1", rowCount: 100 } },
    );

    act(() => {
      result.current.onPaginationModelChange({ page: 5, pageSize: 10 });
    });
    expect(result.current.page).toBe(5);
    expect(result.current.apiPage).toBe(6);

    // Same stale totalCount often still in caller state when filters flip.
    rerender({ resetKey: "server:2", rowCount: 100 });
    expect(result.current.page).toBe(0);
    expect(result.current.apiPage).toBe(1);
    expect(result.current.rowCount).toBe(0);

    rerender({ resetKey: "server:2", rowCount: 12 });
    expect(result.current.page).toBe(0);
    expect(result.current.rowCount).toBe(12);
  });

  it("keeps rowCount stable while the query briefly returns undefined", () => {
    const { result, rerender } = renderHook(
      ({ rowCount }) =>
        useServerGridPagination({
          storageKey: "test-server-stable",
          allowedKey: "10,20",
          rowCount,
          resetKey: "same",
        }),
      { initialProps: { rowCount: 40 as number | undefined } },
    );

    expect(result.current.rowCount).toBe(40);
    rerender({ rowCount: undefined });
    expect(result.current.rowCount).toBe(40);
  });

  it("setPage clamps into the valid range", () => {
    const { result } = renderHook(() =>
      useServerGridPagination({
        storageKey: "test-server-set",
        allowedKey: "10",
        rowCount: 25,
      }),
    );

    act(() => {
      result.current.setPage(99);
    });
    expect(result.current.page).toBe(2);
    expect(result.current.apiPage).toBe(3);
  });

  it("gridProps stay aligned with paginationModel and rowCount", () => {
    const { result } = renderHook(() =>
      useServerGridPagination({
        storageKey: "test-server-props",
        allowedKey: "5,10",
        rowCount: 11,
        pageSizeOptions: [5, 10],
      }),
    );

    expect(result.current.gridProps).toMatchObject({
      paginationMode: "server",
      rowCount: 11,
      pageSizeOptions: [5, 10],
      paginationModel: { page: 0, pageSize: 10 },
    });
  });
});
