import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";
import { MockDataGrid, themeProviderMock, persistedPageSizeMock } from "../test/mockDataGrid";

vi.mock("../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../hooks/usePersistedPageSize.ts", () => persistedPageSizeMock(5));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const putMutateAsync = vi.fn().mockResolvedValue({});
const setAllMutateAsync = vi.fn().mockResolvedValue({});

vi.mock("../api/orval/vpn-profile-notification-preferences/vpn-profile-notification-preferences", () => ({
  getGetApiVpnProfileNotificationPreferencesQueryKey: () => ["vpn-profile-notification-preferences"],
  useGetApiVpnProfileNotificationPreferences: () => ({
    data: {
      globallyEnabled: true,
      preferences: [
        { kind: 0, enabled: true },
        { kind: 1, enabled: false },
      ],
    },
    isLoading: false,
    error: null,
  }),
  usePutApiVpnProfileNotificationPreferences: () => ({
    mutateAsync: putMutateAsync,
    isPending: false,
  }),
  usePostApiVpnProfileNotificationPreferencesSetAllCategories: () => ({
    mutateAsync: setAllMutateAsync,
    isPending: false,
  }),
}));

import NotificationVpnProfileSettings from "./NotificationVpnProfileSettings";

describe("NotificationVpnProfileSettings", () => {
  beforeEach(() => {
    putMutateAsync.mockClear();
    setAllMutateAsync.mockClear();
  });

  it("renders heading, global switch, and notification kinds grid", () => {
    renderWithProviders(<NotificationVpnProfileSettings />);

    expect(screen.getByRole("heading", { name: /VPN profile notifications/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Enabled/i)).toBeChecked();
    expect(screen.getByTestId("mock-grid")).toBeInTheDocument();
    expect(screen.getByTestId("grid-rows").children.length).toBeGreaterThan(0);
  });

  it("toggles global notifications via Orval put", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationVpnProfileSettings />);

    await user.click(screen.getByLabelText(/Enabled/i));
    expect(putMutateAsync).toHaveBeenCalledWith({ data: { globallyEnabled: false } });
  });

  it("enables all kinds via Orval set-all mutation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NotificationVpnProfileSettings />);

    await user.click(screen.getByRole("button", { name: /Enable all kinds/i }));
    expect(setAllMutateAsync).toHaveBeenCalledWith({ data: { enabled: true } });
  });
});
