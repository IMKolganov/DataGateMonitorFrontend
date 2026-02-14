import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState, useEffect } from "react";
import {
  useGetApiNotificationsGetAll,
  useGetApiNotificationsUnreadCount,
  getGetApiNotificationsUnreadCountQueryKey,
  usePostApiNotificationsNotificationIdDelivered,
  usePostApiNotificationsNotificationIdRead,
  usePostApiNotificationsMarkReadAll,
  usePostApiNotificationsNotifyAdmins,
} from "../../api/orval/notification/notification";
import type { NotificationRequest, NotificationItemDto } from "../../api/orval/model";
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

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

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

  const paged = listQuery.data?.notifications;
  const notifications: NotificationItemDto[] = paged?.items ?? [];
  const totalCount = paged?.totalCount ?? 0;
  const totalPages = paged?.totalPages ?? 0;
  const unreadCount = countQuery.data?.count ?? 0;

  useEffect(() => {
    console.debug("[useNotifications] State snapshot", {
      adminUserId,
      page,
      pageSize,
      listParams,
      totalCount,
      totalPages,
      unreadCount,
      notificationsCount: notifications.length,
      listLoading: listQuery.isLoading,
      listFetching: listQuery.isFetching,
      countFetching: countQuery.isFetching,
      markReadPending: mRead.isPending,
    });
  }, [
    adminUserId,
    page,
    pageSize,
    listParams,
    totalCount,
    totalPages,
    unreadCount,
    notifications.length,
    listQuery.isLoading,
    listQuery.isFetching,
    countQuery.isFetching,
    mRead.isPending,
  ]);

  const refresh = useCallback(async () => {
    if (refreshing) {
      console.debug("[useNotifications] Refresh skipped (already refreshing)");
      return;
    }

    console.debug("[useNotifications] Refresh started");
    setRefreshing(true);

    try {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === "/api/notifications/get-all",
        }),
        queryClient.invalidateQueries({ queryKey: getGetApiNotificationsUnreadCountQueryKey() }),
      ]);

      console.debug("[useNotifications] Refresh completed");
    } catch (e) {
      console.error("[useNotifications] Refresh failed", e);
      throw e;
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, refreshing]);

  const markRead = useCallback(
    async (notificationId: number) => {
      console.debug("[useNotifications] markRead called", {
        notificationId,
        adminUserId,
      });

      if (!adminUserId) {
        console.warn("[useNotifications] markRead aborted: adminUserId is 0");
        return;
      }

      if (!notificationId) {
        console.warn("[useNotifications] markRead aborted: notificationId is 0");
        return;
      }

      try {
        const result = await mRead.mutateAsync({
          notificationId,
          params: { adminUserId },
        });

        console.debug("[useNotifications] markRead success", { result });
        await refresh();
      } catch (e) {
        console.error("[useNotifications] markRead failed", e);
        throw e;
      }
    },
    [adminUserId, mRead, refresh]
  );

  const markReadAll = useCallback(async () => {
    console.debug("[useNotifications] markReadAll called");
    try {
      const result = await mMarkReadAll.mutateAsync();
      console.debug("[useNotifications] markReadAll success", { result });
      await refresh();
    } catch (e) {
      console.error("[useNotifications] markReadAll failed", e);
      throw e;
    }
  }, [mMarkReadAll, refresh]);

  const onPaginationModelChange = useCallback((model: { page: number; pageSize: number }) => {
    console.debug("[useNotifications] Pagination model change", model);

    setPage(model.page ?? 0);
    setPageSize(Math.max(1, model.pageSize ?? DEFAULT_PAGE_SIZE));
  }, []);

  const markDelivered = useCallback(
    async (notificationId: number) => {
      console.debug("[useNotifications] markDelivered called", {
        notificationId,
        adminUserId,
      });

      if (!adminUserId) {
        console.warn("[useNotifications] markDelivered aborted: adminUserId is 0");
        return;
      }

      if (!notificationId) {
        console.warn("[useNotifications] markDelivered aborted: notificationId is 0");
        return;
      }

      try {
        const result = await mDelivered.mutateAsync({
          notificationId,
          params: { adminUserId, channel: "web" },
        });

        console.debug("[useNotifications] markDelivered success", { result });
        await refresh();
      } catch (e) {
        console.error("[useNotifications] markDelivered failed", e);
        throw e;
      }
    },
    [adminUserId, mDelivered, refresh]
  );

  const sendTestNotification = useCallback(
    async (request?: Partial<NotificationRequest>) => {
      console.debug("[useNotifications] sendTestNotification called", request);

      try {
        const result = await mNotifyAdmins.mutateAsync({
          data: {
            title: request?.title ?? "Test notification",
            message: request?.message ?? "Sent from dashboard",
            severity: request?.severity,
          } as NotificationRequest,
        });

        console.debug("[useNotifications] sendTestNotification success", { result });
        await refresh();
      } catch (e) {
        console.error("[useNotifications] sendTestNotification failed", e);
        throw e;
      }
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
