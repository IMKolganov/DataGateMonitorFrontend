import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockDataGrid, persistedPageSizeMock, themeProviderMock } from "../../test/mockDataGrid";

vi.mock("../../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../../components/ui/GridFilterBar.tsx", () => ({ GridFilterBar: () => <div /> }));
vi.mock("../../components/ui/UserAvatar.tsx", () => ({ UserAvatar: () => <span /> }));
vi.mock("../../hooks/usePersistedPageSize", () => persistedPageSizeMock(5));
vi.mock("../../hooks/useGridFilterStub.ts", () => ({
  useGridFilters: () => ({
    values: {},
    onChange: vi.fn(),
    onApply: vi.fn(),
    onReset: vi.fn(),
    queryParams: {},
  }),
}));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, isAdmin: true }),
  isAdmin: () => true,
}));
vi.mock("./UserQuotaPlanAssignmentModal", () => ({ UserQuotaPlanAssignmentModal: () => null }));
vi.mock("./UserPasswordAdminSection", () => ({ UserPasswordAdminSection: () => null }));
vi.mock("./UserVpnConnectionsSection", () => ({ UserVpnConnectionsSection: () => null }));
vi.mock("../../components/pihole/UserDnsQueriesSection", () => ({
  UserDnsQueriesSection: () => null,
}));
vi.mock("../../components/quota/UserTrafficQuotaProgress", () => ({
  UserTrafficQuotaProgress: () => null,
}));

const hoisted = vi.hoisted(() => ({ tgPage: 1 }));

vi.mock("../../api/orval/quota-plan/quota-plan", () => {
  const mutate = vi.fn((_v: unknown, opts?: { onSuccess?: (r: unknown) => void }) => {
    opts?.onSuccess?.({ data: { quotaPlans: [] } });
  });
  const mutation = { mutate, isPending: false };
  return {
    usePostApiQuotaPlansGetAll: () => mutation,
  };
});
vi.mock("../../api/orval/user-roles/user-roles", () => {
  const allRoles = { data: { roles: [] }, isLoading: false };
  const userRoles = { data: { assignment: undefined }, isLoading: false };
  return {
    useGetApiUserRolesGetAllRoles: () => allRoles,
    useGetApiUserRolesByUserUserId: () => userRoles,
    usePutApiUserRolesSet: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
    getGetApiUserRolesByUserUserIdQueryKey: () => ["roles"],
  };
});
vi.mock("../../api/orval/user/user", () => {
  const userResponse = {
    data: {
      user: {
        id: 42,
        displayName: "Alice",
        email: "a@ex.com",
        telegramId: 999,
        externalId: "999",
        provider: "telegram",
      },
    },
    isLoading: false,
    error: null,
  };
  return {
    useGetApiUsersGetByIdId: () => userResponse,
    useGetApiUsersEmailConfirmationStatusId: () => ({
      data: { isEmailConfirmed: true },
      isLoading: false,
      refetch: vi.fn(),
    }),
    usePostApiUsersConfirmEmailId: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
    usePostApiUsersUpdate: () => ({ mutateAsync: vi.fn(), isPending: false }),
    getGetApiUsersGetAllQueryKey: () => ["users"],
  };
});
vi.mock("../../api/orval/auth/auth", () => ({
  usePostApiAuthForgotPassword: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("../../api/orval/tv-login-sessions-admin/tv-login-sessions-admin", () => ({
  useGetApiAdminTvLoginSessionsByUserUserIdSummary: () => ({
    data: null,
    isLoading: false,
  }),
}));
vi.mock("../../api/orval/user-quota-plan/user-quota-plan", () => {
  const quota = { data: { userQuotaPlans: [] } };
  return {
    useGetApiUserQuotaPlansGetByUserIdUserId: () => quota,
    usePostApiUserQuotaPlansCreate: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
    usePutApiUserQuotaPlansUpdate: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
    useDeleteApiUserQuotaPlansDeleteId: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
    getGetApiUserQuotaPlansGetByUserIdUserIdQueryKey: () => ["uqp"],
  };
});
vi.mock("../../api/orval/telegram-bot-incoming-message-log/telegram-bot-incoming-message-log", () => ({
  useGetApiTgbotIncomingMessageLogsGetByTelegramUseridTelegramId: (
    _telegramId: number,
    params: { page?: number; pageSize?: number },
  ) => {
    hoisted.tgPage = params.page ?? 1;
    // Stable payload except message text reflecting page
    return {
      data: {
        data: {
          messages: {
            items: [
              {
                id: hoisted.tgPage,
                messageText: `msg-p${hoisted.tgPage}`,
                receivedAt: "2024-01-01T00:00:00Z",
              },
            ],
            totalCount: 40,
          },
        },
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
      error: null,
    };
  },
}));

import { UserDetailPage } from "./UserDetailPage";

describe("UserDetailPage telegram messages pagination", () => {
  it("advances telegram message server page", async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/settings/users/42"]}>
          <Routes>
            <Route path="/settings/users/:userId" element={<UserDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-grid")).toBeInTheDocument();
    });
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-pagination-mode", "server");
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-row-count", "40");
    expect(screen.getByTestId("grid-rows").textContent).toContain("msg-p1");

    await user.click(screen.getByTestId("next-page"));
    expect(hoisted.tgPage).toBe(2);
  });
});
