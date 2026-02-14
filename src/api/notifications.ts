/**
 * Re-exports notification types from orval model.
 * List and unread count are fetched via orval hooks (useGetApiNotificationsGetAll, useGetApiNotificationsUnreadCount).
 */
export type { NotificationItemDto } from "./orval/model";
