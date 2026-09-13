import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/auth/authSelectors", () => ({
  getCurrentUser: vi.fn(() => ({ id: 7 })),
}));

import { getCurrentUser } from "../utils/auth/authSelectors";
import {
  getStoredPageSize,
  setStoredPageSize,
  usePersistedPageSize,
} from "../hooks/usePersistedPageSize";

describe("persisted page size", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getCurrentUser).mockReturnValue({ id: 7 });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns default when nothing stored", () => {
    expect(getStoredPageSize("certs:1", 10, [5, 10, 20])).toBe(10);
  });

  it("persists and restores an allowed page size", () => {
    setStoredPageSize("certs:1", 20);
    expect(getStoredPageSize("certs:1", 10, [5, 10, 20])).toBe(20);
    expect(localStorage.getItem("datagrid-pageSize:7:certs:1")).toBe("20");
  });

  it("ignores disallowed or invalid stored values", () => {
    localStorage.setItem("datagrid-pageSize:7:certs:1", "99");
    expect(getStoredPageSize("certs:1", 10, [5, 10, 20])).toBe(10);
    localStorage.setItem("datagrid-pageSize:7:certs:1", "nope");
    expect(getStoredPageSize("certs:1", 10, [5, 10, 20])).toBe(10);
  });

  it("scopes storage by table key and user", () => {
    setStoredPageSize("certs:1", 5);
    setStoredPageSize("certs:2", 20);
    expect(getStoredPageSize("certs:1", 10, [5, 10, 20])).toBe(5);
    expect(getStoredPageSize("certs:2", 10, [5, 10, 20])).toBe(20);

    vi.mocked(getCurrentUser).mockReturnValue({ id: 8 });
    expect(getStoredPageSize("certs:1", 10, [5, 10, 20])).toBe(10);
  });
});

describe("usePersistedPageSize", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getCurrentUser).mockReturnValue({ id: 7 });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("loads the stored size and writes on setPageSize", () => {
    setStoredPageSize("hook:1", 20);
    const { result } = renderHook(() => usePersistedPageSize("hook:1", 10, "5,10,20"));
    expect(result.current[0]).toBe(20);

    act(() => {
      result.current[1](5);
    });
    expect(result.current[0]).toBe(5);
    expect(getStoredPageSize("hook:1", 10, [5, 10, 20])).toBe(5);
  });

  it("falls back to default when setPageSize receives a disallowed value", () => {
    const { result } = renderHook(() => usePersistedPageSize("hook:bad", 10, "5,10,20"));
    act(() => {
      result.current[1](99);
    });
    expect(result.current[0]).toBe(10);
  });

  it("reloads when storageKey changes", () => {
    setStoredPageSize("hook:a", 5);
    setStoredPageSize("hook:b", 20);

    const { result, rerender } = renderHook(
      ({ key }) => usePersistedPageSize(key, 10, "5,10,20"),
      { initialProps: { key: "hook:a" } },
    );
    expect(result.current[0]).toBe(5);

    rerender({ key: "hook:b" });
    expect(result.current[0]).toBe(20);
  });
});
