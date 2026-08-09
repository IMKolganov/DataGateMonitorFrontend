import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const mutateRead = vi.fn(async () => ({}));
const mutateDelivered = vi.fn(async () => ({}));
const mutateMarkAll = vi.fn(async () => ({}));
const mutateNotify = vi.fn(async () => ({}));
const invalidateQueries = vi.fn(async () => undefined);

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock("../../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 7 }),
}));

vi.mock("../../hooks/usePersistedPageSize", () => ({
  usePersistedPageSize: () => [10, vi.fn()] as const,
}));

vi.mock("../../hooks/useStabilizedRowCount", () => ({
  useStabilizedRowCount: (n: number | undefined) => n ?? 0,
}));

vi.mock("../../api/orval/notification/notification", () => ({
  useGetApiNotificationsGetAll: () => ({
    data: {
      notifications: {
        items: [{ id: 1, title: "n", isRead: false }],
        totalCount: 1,
        totalPages: 1,
      },
    },
    isPending: false,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  }),
  useGetApiNotificationsUnreadCount: () => ({
    data: { count: 3 },
    isPending: false,
    isFetching: false,
  }),
  getGetApiNotificationsUnreadCountQueryKey: () => ["unread"],
  usePostApiNotificationsNotificationIdDelivered: () => ({
    mutateAsync: mutateDelivered,
    isPending: false,
  }),
  usePostApiNotificationsNotificationIdRead: () => ({
    mutateAsync: mutateRead,
    isPending: false,
  }),
  usePostApiNotificationsMarkReadAll: () => ({
    mutateAsync: mutateMarkAll,
    isPending: false,
  }),
  usePostApiNotificationsNotifyAdmins: () => ({ mutateAsync: mutateNotify, isPending: false }),
}));

import { useNotifications, useNotificationsUnreadCount } from "./useNotifications";

describe("useNotifications", () => {
  beforeEach(() => {
    mutateRead.mockClear();
    mutateDelivered.mockClear();
    mutateMarkAll.mockClear();
    mutateNotify.mockClear();
    invalidateQueries.mockClear();
  });

  it("exposes list rows and unread count helpers", () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.totalCount).toBe(1);

    const unread = renderHook(() => useNotificationsUnreadCount());
    expect(unread.result.current.data).toBe(3);
  });

  it("marks read/delivered and refreshes", async () => {
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.markRead(1);
      await result.current.markDelivered(1);
      await result.current.markReadAll();
    });

    expect(mutateRead).toHaveBeenCalled();
    expect(mutateDelivered).toHaveBeenCalled();
    expect(mutateMarkAll).toHaveBeenCalled();
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalled());
  });

  it("sends test notification for admins", async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.sendTestNotification({ title: "t" });
    });
    expect(mutateNotify).toHaveBeenCalled();
  });
});
