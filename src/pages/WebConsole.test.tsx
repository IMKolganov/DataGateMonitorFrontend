import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";
import { VpnServerType } from "../constants/vpnServerType";

const authState = vi.hoisted(() => ({ admin: false }));

vi.mock("../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1 }),
  isAdmin: () => authState.admin,
}));

vi.mock("../api/orval/vpn-servers/vpn-servers", () => ({
  useGetApiOpenVpnServersGetVpnServerId: () => ({
    data: {
      vpnServer: { id: 3, serverName: "ovpn-3", serverType: VpnServerType.OpenVpn },
    },
    isPending: false,
    isLoading: false,
  }),
}));

vi.mock("@microsoft/signalr", () => ({
  HubConnectionBuilder: class {
    withUrl() {
      return this;
    }
    configureLogging() {
      return this;
    }
    withAutomaticReconnect() {
      return this;
    }
    build() {
      return {
        on: vi.fn(),
        start: vi.fn(async () => undefined),
        stop: vi.fn(async () => undefined),
        state: 0,
      };
    }
  },
  LogLevel: { None: 0 },
  HubConnectionState: { Connected: 1, Disconnected: 0 },
}));

vi.mock("../utils/consoleStorage", () => ({
  saveHistoryToDB: vi.fn(),
  loadHistoryFromDB: vi.fn(async () => []),
  clearHistoryDB: vi.fn(),
  saveCommandHistory: vi.fn(),
  loadCommandHistory: vi.fn(async () => []),
}));

vi.mock("../utils/signalr-url", () => ({ getSignalRUrl: () => "http://test/hub" }));
vi.mock("../utils/auth/signalRAccessToken", () => ({ resolveHubAccessToken: async () => "t" }));
vi.mock("../utils/signalrTransport.ts", () => ({ getSignalRPreferredTransport: () => 0 }));

import WebConsole from "./WebConsole";

describe("WebConsole", () => {
  beforeEach(() => {
    authState.admin = false;
  });

  it("denies non-admin users", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers/:vpnServerId/console" element={<WebConsole />} />
      </Routes>,
      { route: "/servers/3/console" },
    );

    expect(
      screen.getByText("OpenVPN management console is available to administrators only."),
    ).toBeInTheDocument();
  });

  it("renders console chrome for admins", () => {
    authState.admin = true;

    renderWithProviders(
      <Routes>
        <Route path="/servers/:vpnServerId/console" element={<WebConsole />} />
      </Routes>,
      { route: "/servers/3/console" },
    );

    expect(screen.getByRole("heading", { name: /Web Console/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear Console/i })).toBeInTheDocument();
    expect(screen.getByText(/Important Information/i)).toBeInTheDocument();
  });
});
