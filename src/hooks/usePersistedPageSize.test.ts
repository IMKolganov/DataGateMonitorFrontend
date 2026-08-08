import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/auth/authSelectors", () => ({
  getCurrentUser: vi.fn(() => ({ id: 7 })),
}));

import { getCurrentUser } from "../utils/auth/authSelectors";
import { getStoredPageSize, setStoredPageSize } from "../hooks/usePersistedPageSize";

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
