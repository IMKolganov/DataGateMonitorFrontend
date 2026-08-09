import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { MockDataGrid, themeProviderMock } from "../../test/mockDataGrid";

vi.mock("../../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("../../api/orval/user/user", () => ({
  getGetApiUsersIdPasswordHistoryQueryKey: (id: number) => ["pw-hist", id],
  useGetApiUsersIdPasswordHistory: () => ({
    data: { items: [] },
    isLoading: false,
    isFetching: false,
  }),
  usePostApiUsersIdSetPassword: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePostApiUsersIdPasswordHistoryHistoryIdRestore: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../../api/orval/vpn-server-clients/vpn-server-clients", () => ({
  useGetApiOpenVpnClientsOverviewUsersSeries: () => ({
    data: { series: [] },
    isLoading: false,
    isFetching: false,
    error: null,
  }),
}));

vi.mock("../../components/DateRangeFilter", () => ({
  default: () => <div data-testid="date-range" />,
}));
vi.mock("../ServersOverview/GeoMap", () => ({ default: () => <div data-testid="geo-map" /> }));

import { UserPasswordAdminSection } from "./UserPasswordAdminSection";
import { UserVpnConnectionsSection } from "./UserVpnConnectionsSection";
import { UserQuotaPlanAssignmentModal } from "./UserQuotaPlanAssignmentModal";

describe("UserPasswordAdminSection", () => {
  it("renders password admin chrome", () => {
    renderWithProviders(<UserPasswordAdminSection userId={7} />);
    expect(screen.getByText("Password (admin)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Set password/i })).toBeInTheDocument();
    expect(screen.getByText("No password history yet.")).toBeInTheDocument();
  });
});

describe("UserVpnConnectionsSection", () => {
  it("prompts for external ID when missing", () => {
    renderWithProviders(<UserVpnConnectionsSection externalId={null} />);
    expect(screen.getByText("VPN connections")).toBeInTheDocument();
    expect(screen.getByText(/external ID/i)).toBeInTheDocument();
  });

  it("shows session activity when external ID is present", () => {
    renderWithProviders(<UserVpnConnectionsSection externalId="ext-7" />);
    expect(screen.getByText(/Session activity by period/i)).toBeInTheDocument();
  });
});

describe("UserQuotaPlanAssignmentModal", () => {
  it("renders assign chrome when open", () => {
    renderWithProviders(
      <UserQuotaPlanAssignmentModal
        isOpen
        userId={7}
        plans={[{ id: 1, name: "Free", isActive: true, isDefault: true }]}
        editItem={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );
    expect(screen.getByText("Assign quota plan")).toBeInTheDocument();
    expect(screen.getByLabelText(/Quota plan/i)).toBeInTheDocument();
  });
});
