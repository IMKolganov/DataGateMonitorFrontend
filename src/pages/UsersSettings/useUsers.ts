import { useMemo, useState, useCallback } from "react";
import { useGetApiUsersGetAll } from "../../api/orval/user/user";
import type { GetAllUsersResponse, UserDto } from "../../api/orvalModelShim";
import type { GridPaginationModel } from "@mui/x-data-grid";
import type { ApiEnvelope } from "../TelegramBotSettings/unwrapApiResponse";
import { unwrapMaybeApiResponse } from "../TelegramBotSettings/unwrapApiResponse";
import { isCanceledError } from "../../utils/queryCanceled";
import { getStoredPageSize, setStoredPageSize } from "../../hooks/usePersistedPageSize";

const DEFAULT_PAGE_SIZE = 10;

/** MIT `DataGrid` caps `pageSize` at 100; `DataGridPro` is required above that. */
const PAGE_SIZE_OPTIONS_DATAGRID = [5, 10, 20, 50, 100] as const;

/** User quotas page uses a plain list + API paging (no DataGrid), so larger pages are allowed. */
const PAGE_SIZE_OPTIONS_LIST = [5, 10, 20, 50, 100, 200, 500, 1000] as const;

const STORAGE_KEY_DATAGRID = "settings-users";
const STORAGE_KEY_LIST = "settings-users-quotas";

export type UseUsersMode = "datagrid" | "list";

export function useUsers(options?: { mode?: UseUsersMode }) {
  const mode = options?.mode ?? "datagrid";
  const pageSizeOptions = mode === "list" ? PAGE_SIZE_OPTIONS_LIST : PAGE_SIZE_OPTIONS_DATAGRID;
  const storageKey = mode === "list" ? STORAGE_KEY_LIST : STORAGE_KEY_DATAGRID;

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>(() => ({
    page: 0,
    pageSize: getStoredPageSize(storageKey, DEFAULT_PAGE_SIZE, [...pageSizeOptions]),
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
        setStoredPageSize(storageKey, model.pageSize);
      }
      return model;
    });
  }, [storageKey]);

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
    pageSizeOptions,
    anyLoading,
    refreshing,
    errorMessage,
    handleRefresh,
  };
}
