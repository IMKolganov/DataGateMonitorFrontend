import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  useGetApiNotificationsGetAll,
  useGetApiNotificationsUnreadCount,
  getGetApiNotificationsGetAllQueryKey,
  getGetApiNotificationsUnreadCountQueryKey,
  usePostApiNotificationsNotificationIdDelivered,
  usePostApiNotificationsNotificationIdRead,
  usePostApiNotificationsNotifyAdmins,
} from "../../api/orval/notification/notification";
import type { NotificationRequest } from "../../api/orval/model";
import type { NotificationItemDto } from "../../api/orval/model";
import { getCurrentUser } from "../../utils/auth/authSelectors";

export function useNotificationsList() {
  return useGetApiNotificationsGetAll();
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

  const listQuery = useGetApiNotificationsGetAll();
  const countQuery = useGetApiNotificationsUnreadCount();
  const [refreshing, setRefreshing] = useState(false);

  const mRead = usePostApiNotificationsNotificationIdRead();
  const mDelivered = usePostApiNotificationsNotificationIdDelivered();
  const mNotifyAdmins = usePostApiNotificationsNotifyAdmins();

  const notifications: NotificationItemDto[] = listQuery.data?.notifications ?? [];
  const unreadCount = countQuery.data?.count ?? 0;

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetApiNotificationsGetAllQueryKey() }),
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
    anyLoading,
    refreshing,
    errorMessage,
    refresh,
    markRead,
    markDelivered,
    sendTestNotification,
    adminUserId,
    markReadLoading: mRead.isPending,
    sendTestLoading: mNotifyAdmins.isPending,
  };
}
