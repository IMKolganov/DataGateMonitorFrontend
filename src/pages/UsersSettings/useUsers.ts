import { useMemo, useState, useCallback } from "react";
import { useGetApiUsersGetAll } from "../../api/orval/user/user";
import type { GetAllUsersResponse, UserDto } from "../../api/orval/model";
import type { GridPaginationModel } from "@mui/x-data-grid";
import type { ApiEnvelope } from "../TelegramBotSettings/unwrapApiResponse";
import { unwrapMaybeApiResponse } from "../TelegramBotSettings/unwrapApiResponse";
import { isCanceledError } from "../../utils/queryCanceled";
import { getStoredPageSize, setStoredPageSize } from "../../hooks/usePersistedPageSize";

const DEFAULT_PAGE_SIZE = 10;
const USERS_PAGE_SIZE_KEY = "settings-users";
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100] as const;

export function useUsers() {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>(() => ({
    page: 0,
    pageSize: getStoredPageSize(USERS_PAGE_SIZE_KEY, DEFAULT_PAGE_SIZE, [...PAGE_SIZE_OPTIONS]),
  }));
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const params = useMemo(
    () => ({
      Page: paginationModel.page + 1,
      PageSize: paginationModel.pageSize,
    }),
    [paginationModel.page, paginationModel.pageSize]
  );

  const qUsers = useGetApiUsersGetAll(params, {
    query: { placeholderData: (prev) => prev },
  });

  const { users, totalCount } = useMemo(() => {
    const payload = unwrapMaybeApiResponse<GetAllUsersResponse>(
      qUsers.data as GetAllUsersResponse | ApiEnvelope<GetAllUsersResponse> | undefined,
    );
    const list = (payload?.users ?? []) as UserDto[];
    const total = payload?.totalCount ?? 0;
    return { users: list, totalCount: total };
  }, [qUsers.data]);

  const onPaginationModelChange = useCallback((model: GridPaginationModel) => {
    setPaginationModel((prev) => {
      if (prev.page === model.page && prev.pageSize === model.pageSize) return prev;
      if (model.pageSize !== prev.pageSize) {
        setStoredPageSize(USERS_PAGE_SIZE_KEY, model.pageSize);
      }
      return model;
    });
  }, []);

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
    isCanceledError(qUsers.error)
      ? null
      : qUsers.error instanceof Error
        ? qUsers.error.message
        : qUsers.error
          ? "Failed to load users"
          : null;

  return {
    users,
    totalCount,
    paginationModel,
    onPaginationModelChange,
    anyLoading,
    refreshing,
    errorMessage,
    handleRefresh,
  };
}
