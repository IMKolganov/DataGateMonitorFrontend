import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { VpnServerType } from "../constants/vpnServerType";

const authState = vi.hoisted(() => ({
  admin: true,
}));

vi.mock("../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, roles: authState.admin ? ["Admin"] : ["VpnUser"] }),
  isAdmin: () => authState.admin,
}));

vi.mock("../api/orval/vpn-servers/vpn-servers", () => ({
  useGetApiOpenVpnServersGetVpnServerId: () => ({
    data: {
      vpnServer: {
        id: 9,
        serverName: "Edge-9",
        serverType: VpnServerType.OpenVpn,
      },
    },
    isLoading: false,
    isFetching: false,
  }),
}));

import ServerDetails from "./ServerDetails";

describe("ServerDetails", () => {
  beforeEach(() => {
    authState.admin = true;
  });

  it("renders heading and admin tabs for OpenVPN", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers/:vpnServerId/*" element={<ServerDetails />}>
          <Route index element={<div>General tab</div>} />
        </Route>
      </Routes>,
      { route: "/servers/9" },
    );

    expect(screen.getByRole("heading", { name: /Server Details for Server Edge-9/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back/i })).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Web console")).toBeInTheDocument();
    expect(screen.getByText("Statistics")).toBeInTheDocument();
    expect(screen.getByText("Pi-hole")).toBeInTheDocument();
    expect(screen.getByText("General tab")).toBeInTheDocument();
  });

  it("hides admin-only tabs for non-admin users", () => {
    authState.admin = false;

    renderWithProviders(
      <Routes>
        <Route path="/servers/:vpnServerId/*" element={<ServerDetails />}>
          <Route path="statistics" element={<div>Stats</div>} />
        </Route>
      </Routes>,
      { route: "/servers/9/statistics" },
    );

    expect(screen.getByText("Statistics")).toBeInTheDocument();
    expect(screen.queryByText("Web console")).not.toBeInTheDocument();
    expect(screen.queryByText("Events")).not.toBeInTheDocument();
  });
});
