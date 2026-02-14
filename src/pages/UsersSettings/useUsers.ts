import { useMemo, useState } from "react";
import { useGetApiUsersGetAll } from "../../api/orval/user/user";
import type { GetAllUsersResponse, UserDto } from "../../api/orval/model";
import { unwrapMaybeApiResponse } from "../TelegramBotSettings/unwrapApiResponse";

export function useUsers() {
  const qUsers = useGetApiUsersGetAll();
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const users: UserDto[] = useMemo(() => {
    const payload = unwrapMaybeApiResponse<GetAllUsersResponse>(qUsers.data as any);
    return (payload?.users ?? []) as UserDto[];
  }, [qUsers.data]);

  const handleRefresh = async () => {
    if (qUsers.isFetching || manualRefreshing) return;
    setManualRefreshing(true);
    try {
      await qUsers.refetch();
    } finally {
      setManualRefreshing(false);
    }
  };

  const anyLoading = qUsers.isLoading || qUsers.isFetching;
  const refreshing = manualRefreshing || qUsers.isFetching;

  const errorMessage =
    qUsers.error instanceof Error
      ? qUsers.error.message
      : qUsers.error
        ? "Failed to load users"
        : null;

  return {
    users,
    anyLoading,
    refreshing,
    errorMessage,
    handleRefresh,
  };
}
