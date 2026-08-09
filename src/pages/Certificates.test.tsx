import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { VpnServerType } from "../constants/vpnServerType";

const authState = vi.hoisted(() => ({ admin: true }));

vi.mock("../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, roles: authState.admin ? ["Admin"] : ["VpnUser"] }),
  isAdmin: () => authState.admin,
}));

vi.mock("../components/certs/CertificatesData.tsx", () => ({
  default: ({ vpnServerId, stack }: { vpnServerId: string; stack: string }) => (
    <div data-testid="certs-data">
      {stack}:{vpnServerId}
    </div>
  ),
}));

vi.mock("../api/orval/vpn-servers/vpn-servers", () => ({
  useGetApiOpenVpnServersGetVpnServerId: () => ({
    data: {
      vpnServer: {
        id: 8,
        serverName: "Cert-8",
        serverType: VpnServerType.OpenVpn,
      },
    },
    isLoading: false,
    isPending: false,
    isSuccess: true,
  }),
}));

import Certificates from "./Certificates";

describe("Certificates", () => {
  beforeEach(() => {
    authState.admin = true;
  });

  it("renders OpenVPN certificates heading for admins", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers/:vpnServerId/certificates" element={<Certificates />} />
      </Routes>,
      { route: "/servers/8/certificates" },
    );

    expect(
      screen.getByRole("heading", { name: /VPN Certificates & OVPN Files for Server Cert-8/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("certs-data")).toHaveTextContent("openvpn:8");
  });

  it("shows access restricted for non-admins", () => {
    authState.admin = false;
    renderWithProviders(
      <Routes>
        <Route path="/servers/:vpnServerId/certificates" element={<Certificates />} />
      </Routes>,
      { route: "/servers/8/certificates" },
    );

    expect(screen.getByText(/Access restricted/i)).toBeInTheDocument();
  });
});
