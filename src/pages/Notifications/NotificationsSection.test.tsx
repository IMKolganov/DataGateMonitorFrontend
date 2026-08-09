import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { MockDataGrid, themeProviderMock } from "../../test/mockDataGrid";
import { NotificationsSection } from "./NotificationsSection";

vi.mock("../../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));

const baseProps = {
  notifications: [] as [],
  totalCount: 0,
  page: 0,
  pageSize: 10,
  onPaginationModelChange: vi.fn(),
  readFilter: "all" as const,
  onReadFilterChange: vi.fn(),
  typeFilter: "",
  onTypeFilterChange: vi.fn(),
  severityEnabled: [true, true, true, true] as [boolean, boolean, boolean, boolean],
  onToggleSeverity: vi.fn(),
  anyLoading: false,
  refreshing: false,
  errorMessage: null as string | null,
  handleRefresh: vi.fn(),
  onMarkRead: vi.fn(),
  markReadLoading: false,
  onMarkReadAll: vi.fn(),
  markReadAllLoading: false,
  onSendTest: vi.fn(),
  sendTestLoading: false,
  showSendTest: true,
};

describe("NotificationsSection", () => {
  it("shows error message when provided", () => {
    renderWithProviders(<NotificationsSection {...baseProps} errorMessage="boom" />);
    expect(screen.getByText("❌ boom")).toBeInTheDocument();
  });

  it("shows empty-state no-rows label", () => {
    renderWithProviders(<NotificationsSection {...baseProps} />);
    expect(screen.getByTestId("no-rows")).toHaveTextContent(/No notifications/i);
  });

  it("calls mark-read-all and hides send-test when disabled", async () => {
    const user = userEvent.setup();
    const onMarkReadAll = vi.fn();
    renderWithProviders(
      <NotificationsSection
        {...baseProps}
        onMarkReadAll={onMarkReadAll}
        markReadAllLoading
        showSendTest={false}
      />,
    );

    const markAll = screen.getByRole("button", { name: /Mark read all/i });
    expect(markAll).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Send test notification/i })).not.toBeInTheDocument();

    renderWithProviders(
      <NotificationsSection {...baseProps} onMarkReadAll={onMarkReadAll} showSendTest={false} />,
    );
    await user.click(screen.getAllByRole("button", { name: /Mark read all/i })[1]!);
    expect(onMarkReadAll).toHaveBeenCalled();
  });
});
