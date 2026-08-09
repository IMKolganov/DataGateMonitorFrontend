import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { MockDataGrid, themeProviderMock, persistedPageSizeMock } from "../../test/mockDataGrid";

vi.mock("../ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../../hooks/usePersistedPageSize.ts", () => persistedPageSizeMock(10));

const authState = vi.hoisted(() => ({ admin: true }));
vi.mock("../../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1 }),
  isAdmin: () => authState.admin,
}));

const profilesState = vi.hoisted(() => ({
  files: [{ commonName: "cn-1", isRevoked: false }] as { commonName: string; isRevoked: boolean }[],
}));

vi.mock("../../api/orval/open-vpn-files/open-vpn-files", () => ({
  useGetApiOpenVpnFilesGetAllVpnServerIdExternalId: () => ({
    data: { issuedOvpnFiles: profilesState.files },
    isLoading: false,
    isFetching: false,
  }),
}));

vi.mock("../../api/orval/vpn-server-event/vpn-server-event", () => ({
  useGetApiOpenVpnEventsGetByServer: () => ({
    data: { items: [], totalCount: 0 },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

import { UserOpenVpnEventsSection } from "./UserOpenVpnEventsSection";

describe("UserOpenVpnEventsSection", () => {
  beforeEach(() => {
    authState.admin = true;
    profilesState.files = [{ commonName: "cn-1", isRevoked: false }];
  });

  it("renders OpenVPN events heading and profile select for admin", () => {
    renderWithProviders(<UserOpenVpnEventsSection externalId="ext-1" vpnServerId={7} />);
    expect(screen.getByText("OpenVPN events")).toBeInTheDocument();
    expect(screen.getByText(/OpenVPN profile \(CN\)/i)).toBeInTheDocument();
  });

  it("returns null when not enabled", () => {
    const { container } = renderWithProviders(
      <UserOpenVpnEventsSection externalId="" vpnServerId={7} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows no-profiles message when files empty", () => {
    profilesState.files = [];
    renderWithProviders(<UserOpenVpnEventsSection externalId="ext-1" vpnServerId={7} />);
    expect(screen.getByText(/No issued OpenVPN profiles/i)).toBeInTheDocument();
  });
});
