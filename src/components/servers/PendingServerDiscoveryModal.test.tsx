import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { PENDING_DISCOVERY_SNOOZE_KEY } from "../../utils/servers/pendingServerDiscovery";
import { openPendingServerDiscovery } from "./pendingServerDiscoveryEvents";

const authState = vi.hoisted(() => ({ admin: true }));
const denyMutateAsync = vi.hoisted(() => vi.fn());
const approveMutateAsync = vi.hoisted(() =>
  vi.fn(async () => ({ vpnServerId: 42, discovery: { id: 1, status: 1 } })),
);
const pendingState = vi.hoisted(() => ({
  discoveries: [
    {
      id: 1,
      apiUrl: "http://10.0.0.1:5010/",
      suggestedName: "node-a",
      publicIp: "10.0.0.1",
      serverType: 0,
      isEnableWss: false,
      version: "1.0.0",
    },
    {
      id: 2,
      apiUrl: "https://xray.example:9443/",
      suggestedName: "node-b",
      publicIp: "10.0.0.2",
      serverType: 1,
      isEnableWss: true,
      version: "2.0.0",
    },
    {
      id: 3,
      apiUrl: "http://10.0.0.3:5010/",
      suggestedName: "node-c",
      publicIp: "10.0.0.3",
      serverType: 0,
      isEnableWss: false,
    },
  ] as Array<Record<string, unknown>>,
}));

vi.mock("react-toastify", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock("../../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, roles: authState.admin ? ["Admin"] : ["VpnUser"] }),
  isAdmin: () => authState.admin,
}));

vi.mock("../../api/orval/vpn-servers/vpn-servers", () => ({
  useGetApiOpenVpnServersDiscoveriesPending: () => ({
    data: { discoveries: pendingState.discoveries },
    refetch: vi.fn(),
    isLoading: false,
    isError: false,
  }),
  usePostApiOpenVpnServersDiscoveriesDiscoveryIdApprove: () => ({
    mutateAsync: approveMutateAsync,
    isPending: false,
  }),
  usePostApiOpenVpnServersDiscoveriesDiscoveryIdDeny: () => ({
    mutateAsync: denyMutateAsync,
    isPending: false,
  }),
  getGetApiOpenVpnServersDiscoveriesPendingQueryKey: () => ["discoveries-pending"],
  getGetApiOpenVpnServersGetVpnServerIdQueryKey: (id: number) => ["server", id],
  getGetApiOpenVpnServersGetServerWithStatusVpnServerIdQueryKey: (id: number) => ["status", id],
}));

vi.mock("../../api/orval/vpn-servers-v3/vpn-servers-v3", () => ({
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey: () => ["v3-servers"],
}));

vi.mock("../../api/orval/quota-plan-allowed-server/quota-plan-allowed-server", () => ({
  getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey: (id: number) => [
    "allowed",
    id,
  ],
}));

import { PendingServerDiscoveryModal } from "./PendingServerDiscoveryModal";

describe("PendingServerDiscoveryModal", () => {
  beforeEach(() => {
    authState.admin = true;
    sessionStorage.clear();
    denyMutateAsync.mockClear();
    approveMutateAsync.mockClear();
    pendingState.discoveries = [
      {
        id: 1,
        apiUrl: "http://10.0.0.1:5010/",
        suggestedName: "node-a",
        publicIp: "10.0.0.1",
        serverType: 0,
        isEnableWss: false,
        version: "1.0.0",
      },
      {
        id: 2,
        apiUrl: "https://xray.example:9443/",
        suggestedName: "node-b",
        publicIp: "10.0.0.2",
        serverType: 1,
        isEnableWss: true,
        version: "2.0.0",
      },
      {
        id: 3,
        apiUrl: "http://10.0.0.3:5010/",
        suggestedName: "node-c",
        publicIp: "10.0.0.3",
        serverType: 0,
        isEnableWss: false,
      },
    ];
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("renders blocking modal for admin with Open all when multiple pending", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers" element={<PendingServerDiscoveryModal />} />
      </Routes>,
      { route: "/servers" },
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/New VPN server detected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open all \(3\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Later$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review/i })).toBeInTheDocument();
  });

  it("Later snoozes without calling deny", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/servers" element={<PendingServerDiscoveryModal />} />
      </Routes>,
      { route: "/servers" },
    );

    await user.click(screen.getByRole("button", { name: /^Later$/i }));

    expect(denyMutateAsync).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(PENDING_DISCOVERY_SNOOZE_KEY)).toBe("1,2,3");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("reopens after Later when a new discovery joins the set", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(
      <Routes>
        <Route path="/servers" element={<PendingServerDiscoveryModal />} />
      </Routes>,
      { route: "/servers" },
    );

    await user.click(screen.getByRole("button", { name: /^Later$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    pendingState.discoveries = [
      ...pendingState.discoveries,
      {
        id: 4,
        apiUrl: "http://10.0.0.4:5010/",
        suggestedName: "node-d",
        serverType: 0,
      },
    ];

    rerender(
      <Routes>
        <Route path="/servers" element={<PendingServerDiscoveryModal />} />
      </Routes>,
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("hides on pending-discoveries route", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers/pending-discoveries" element={<PendingServerDiscoveryModal />} />
      </Routes>,
      { route: "/servers/pending-discoveries" },
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render for non-admin", () => {
    authState.admin = false;
    renderWithProviders(
      <Routes>
        <Route path="/servers" element={<PendingServerDiscoveryModal />} />
      </Routes>,
      { route: "/servers" },
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Open all navigates to pending list", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/servers" element={<PendingServerDiscoveryModal />} />
        <Route path="/servers/pending-discoveries" element={<div>Inbox</div>} />
      </Routes>,
      { route: "/servers" },
    );

    await user.click(screen.getByRole("button", { name: /Open all \(3\)/i }));
    expect(await screen.findByText("Inbox")).toBeInTheDocument();
  });

  it("force-opens from notification event after snooze", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/servers" element={<PendingServerDiscoveryModal />} />
      </Routes>,
      { route: "/servers" },
    );

    await user.click(screen.getByRole("button", { name: /^Later$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    openPendingServerDiscovery(2);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
