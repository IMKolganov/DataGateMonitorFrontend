import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  useGetApiNotificationsGetAll,
  useGetApiNotificationsUnreadCount,
  getGetApiNotificationsUnreadCountQueryKey,
  usePostApiNotificationsNotificationIdDelivered,
  usePostApiNotificationsNotificationIdRead,
  usePostApiNotificationsMarkReadAll,
  usePostApiNotificationsNotifyAdmins,
} from "../../api/orval/notification/notification";
import type { NotificationRequest } from "../../api/orval/model";
import type { NotificationItemDto } from "../../api/orval/model";
import { getCurrentUser } from "../../utils/auth/authSelectors";

const DEFAULT_PAGE_SIZE = 10;

export function useNotificationsList(params?: { Page?: number; PageSize?: number }) {
  return useGetApiNotificationsGetAll(params);
}

export function useNotificationsUnreadCount() {
  const query = useGetApiNotificationsUnreadCount();
  const count = query.data?.count ?? 0;
  return { ...query, data: count };
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const adminUserId = user?.id ?? 0;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const listQuery = useGetApiNotificationsGetAll({
    Page: page,
    PageSize: pageSize,
  });
  const countQuery = useGetApiNotificationsUnreadCount();
  const [refreshing, setRefreshing] = useState(false);

  const mRead = usePostApiNotificationsNotificationIdRead();
  const mDelivered = usePostApiNotificationsNotificationIdDelivered();
  const mMarkReadAll = usePostApiNotificationsMarkReadAll();
  const mNotifyAdmins = usePostApiNotificationsNotifyAdmins();

  const paged = listQuery.data?.notifications;
  const notifications: NotificationItemDto[] = paged?.items ?? [];
  const totalCount = paged?.totalCount ?? 0;
  const totalPages = paged?.totalPages ?? 0;
  const unreadCount = countQuery.data?.count ?? 0;

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

  const onPaginationModelChange = useCallback(
    (model: { page: number; pageSize: number }) => {
      setPage(model.page + 1);
      setPageSize(model.pageSize);
    },
    []
  );

  const markDelivered = useCallback(
    async (notificationId: number) => {
      if (!adminUserId) return;
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

  const errorMessage =
    listQuery.error instanceof Error
      ? listQuery.error.message
      : listQuery.error
        ? "Failed to load notifications"
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
