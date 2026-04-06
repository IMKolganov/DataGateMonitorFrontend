import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  useGetApiNotificationsGetAll,
  useGetApiNotificationsUnreadCount,
  getGetApiNotificationsUnreadCountQueryKey,
  usePostApiNotificationsNotificationIdDelivered,
  usePostApiNotificationsNotificationIdRead,
  usePostApiNotificationsMarkReadAll,
  usePostApiNotificationsNotifyAdmins,
} from "../../api/orval/notification/notification";
import type {
  NotificationRequest,
  NotificationItemDto,
  GetNotificationsResponse,
  UnreadCountResponse,
} from "../../api/orval/model";
import { getCurrentUser } from "../../utils/auth/authSelectors";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize";

const DEFAULT_PAGE_SIZE = 10;

export function useNotificationsList(params?: { Page?: number; PageSize?: number }) {
  return useGetApiNotificationsGetAll(params);
}

export function useNotificationsUnreadCount() {
  const query = useGetApiNotificationsUnreadCount();
  const payload = query.data as unknown as UnreadCountResponse | undefined;
  const count = payload?.count ?? 0;
  return { ...query, data: count };
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const adminUserId = user?.id ?? 0;

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize(
    "notifications",
    DEFAULT_PAGE_SIZE,
    "5,10,20,50,100",
  );

  const listParams = useMemo(
    () => ({ Page: page + 1, PageSize: pageSize }),
    [page, pageSize]
  );

  const listQuery = useGetApiNotificationsGetAll(listParams, {
    query: { placeholderData: (prev) => prev },
  });

  const countQuery = useGetApiNotificationsUnreadCount();
  const [refreshing, setRefreshing] = useState(false);

  const mRead = usePostApiNotificationsNotificationIdRead();
  const mDelivered = usePostApiNotificationsNotificationIdDelivered();
  const mMarkReadAll = usePostApiNotificationsMarkReadAll();
  const mNotifyAdmins = usePostApiNotificationsNotifyAdmins();

  const listPayload = listQuery.data as unknown as GetNotificationsResponse | undefined;
  const paged = listPayload?.notifications;
  const notifications: NotificationItemDto[] = paged?.items ?? [];
  const totalCount = paged?.totalCount ?? 0;
  const totalPages = paged?.totalPages ?? 0;
  const unreadPayload = countQuery.data as unknown as UnreadCountResponse | undefined;
  const unreadCount = unreadPayload?.count ?? 0;

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === "/api/notifications/get-all",
        }),
        queryClient.invalidateQueries({ queryKey: getGetApiNotificationsUnreadCountQueryKey() }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, refreshing]);

  const markRead = useCallback(
    async (notificationId: number) => {
      if (!adminUserId) return;
      if (!notificationId) return;
      await mRead.mutateAsync({
        notificationId,
        params: { adminUserId },
      });
      await refresh();
    },
    [adminUserId, mRead, refresh]
  );

  const markReadAll = useCallback(async () => {
    await mMarkReadAll.mutateAsync();
    await refresh();
  }, [mMarkReadAll, refresh]);

  const onPaginationModelChange = useCallback((model: { page: number; pageSize: number }) => {
    setPage(model.page ?? 0);
    setPageSize(Math.max(1, model.pageSize ?? DEFAULT_PAGE_SIZE));
  }, []);

  const markDelivered = useCallback(
    async (notificationId: number) => {
      if (!adminUserId) return;
      if (!notificationId) return;
      await mDelivered.mutateAsync({
        notificationId,
        params: { adminUserId, channel: "web" },
      });
      await refresh();
    },
    [adminUserId, mDelivered, refresh]
  );

  const sendTestNotification = useCallback(
    async (request?: Partial<NotificationRequest>) => {
      await mNotifyAdmins.mutateAsync({
        data: {
          title: request?.title ?? "Test notification",
          message: request?.message ?? "Sent from dashboard",
          severity: request?.severity,
        } as NotificationRequest,
      });
      await refresh();
    },
    [mNotifyAdmins, refresh]
  );

  const anyLoading =
    listQuery.isLoading ||
    listQuery.isFetching ||
    countQuery.isFetching ||
    mRead.isPending ||
    mDelivered.isPending ||
    mMarkReadAll.isPending ||
    mNotifyAdmins.isPending;

  const isAbortOrCancelError = (e: unknown): boolean => {
    if (!e || typeof e !== "object") return false;
    const err = e as { name?: string; code?: string; message?: string };
    return (
      err.name === "AbortError" ||
      err.name === "CanceledError" ||
      err.code === "ERR_CANCELED" ||
      err.message === "canceled"
    );
  };

  const errorMessage =
    listQuery.error != null && !isAbortOrCancelError(listQuery.error)
      ? listQuery.error instanceof Error
        ? listQuery.error.message
        : "Failed to load notifications"
      : null;

  return {
    notifications,
    unreadCount,
    totalCount,
    totalPages,
    page,
    pageSize,
    onPaginationModelChange,
    anyLoading,
    refreshing,
    errorMessage,
    refresh,
    markRead,
    markReadAll,
    markDelivered,
    sendTestNotification,
    adminUserId,
    markReadLoading: mRead.isPending,
    markReadAllLoading: mMarkReadAll.isPending,
    sendTestLoading: mNotifyAdmins.isPending,
  };
}
