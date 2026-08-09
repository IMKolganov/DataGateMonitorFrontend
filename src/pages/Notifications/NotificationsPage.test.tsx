import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { MockDataGrid, themeProviderMock } from "../../test/mockDataGrid";

vi.mock("../../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));

const authState = vi.hoisted(() => ({ admin: true }));
vi.mock("../../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1 }),
  isAdmin: () => authState.admin,
}));

const refresh = vi.fn();
const markReadAll = vi.fn();
const sendTestNotification = vi.fn();

vi.mock("./useNotifications", () => ({
  useNotifications: () => ({
    notifications: [
      {
        id: 1,
        title: "Hello",
        message: "World",
        isRead: false,
        severity: "Info",
        type: "System",
        createDate: "2024-01-01T00:00:00Z",
      },
    ],
    totalCount: 1,
    page: 0,
    pageSize: 10,
    onPaginationModelChange: vi.fn(),
    readFilter: "all",
    setReadFilter: vi.fn(),
    typeFilter: "all",
    setTypeFilter: vi.fn(),
    severityEnabled: { Info: true, Warning: true, Error: true },
    toggleSeverity: vi.fn(),
    anyLoading: false,
    refreshing: false,
    errorMessage: null,
    refresh,
    markRead: vi.fn(),
    markReadAll,
    sendTestNotification,
    adminUserId: 1,
    markReadLoading: false,
    markReadAllLoading: false,
    sendTestLoading: false,
  }),
}));

import NotificationsPage from "./NotificationsPage";

describe("NotificationsPage", () => {
  beforeEach(() => {
    authState.admin = true;
    refresh.mockClear();
    markReadAll.mockClear();
    sendTestNotification.mockClear();
  });

  it("renders heading, filters, and admin send-test action", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationsPage />);

    expect(screen.getByRole("heading", { name: /Notifications/i })).toBeInTheDocument();
    expect(screen.getByText(/Notifications for the current user/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Unread" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Refresh/i }));
    expect(refresh).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Mark read all/i }));
    expect(markReadAll).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Send test notification/i }));
    expect(sendTestNotification).toHaveBeenCalled();
  });

  it("hides send-test for non-admin users", () => {
    authState.admin = false;
    renderWithProviders(<NotificationsPage />);
    expect(screen.queryByRole("button", { name: /Send test notification/i })).not.toBeInTheDocument();
  });
});
