import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";

vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("../components/certExpiry/CertExpiryCheckPanel.tsx", () => ({
  default: ({ vpnServerId }: { vpnServerId?: number }) => (
    <div data-testid={vpnServerId ? `cert-panel-${vpnServerId}` : "cert-panel-all"} />
  ),
}));

const mutateAsync = vi.fn().mockResolvedValue({ success: true });
const refetch = vi.fn();

vi.mock("../api/orval/settings/settings", () => ({
  useGetApiSettingsGet: () => ({
    data: { value: "30" },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch,
  }),
  usePostApiSettingsSet: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

vi.mock("../api/orval/vpn-servers-v3/vpn-servers-v3", () => ({
  getApiV3OpenVpnServersGetAllWithStatus: vi.fn().mockResolvedValue({
    vpnServerWithStatuses: [
      {
        vpnServerResponses: {
          vpnServer: {
            id: 7,
            serverName: "ovpn-alpha",
            serverType: 0,
            isDisabled: false,
            isDeleted: false,
            apiUrl: "http://ovpn.local",
          },
        },
      },
    ],
  }),
}));

import CertExpirySettings from "./CertExpirySettings";

describe("CertExpirySettings", () => {
  beforeEach(() => {
    mutateAsync.mockClear();
    refetch.mockClear();
  });

  it("renders warning days and all-servers check panel", async () => {
    renderWithProviders(<CertExpirySettings />);

    expect(screen.getByRole("heading", { name: /OVPN certificate expiry/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("30")).toBeInTheDocument();
    expect(screen.getByTestId("cert-panel-all")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /ovpn-alpha/i })).toBeInTheDocument();
    });
  });

  it("saves warning days via Orval mutation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CertExpirySettings />);

    const warningInput = screen.getByRole("spinbutton");
    await user.clear(warningInput);
    await user.type(warningInput, "14");
    await user.click(screen.getByRole("button", { name: /Save/i }));

    expect(mutateAsync).toHaveBeenCalledWith({
      params: {
        Key: "OvpnCertExpiry_Warning_Days",
        Value: "14",
        Type: "int",
      },
    });
  });

  it("shows per-server check panel after selecting a server", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CertExpirySettings />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /ovpn-alpha/i })).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText(/OpenVPN server/i), "7");
    expect(screen.getByTestId("cert-panel-7")).toBeInTheDocument();
  });
});
