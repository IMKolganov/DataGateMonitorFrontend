import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";

const approveMutateAsync = vi.hoisted(() =>
  vi.fn(async () => ({ vpnServerId: 55, discovery: { id: 1, status: 1 } })),
);
const denyMutateAsync = vi.hoisted(() => vi.fn(async () => ({})));
const pendingState = vi.hoisted(() => ({
  discoveries: [
    {
      id: 10,
      apiUrl: "http://10.0.0.10:5010/",
      suggestedName: "alpha",
      publicIp: "10.0.0.10",
      serverType: 0,
      lastSeenUtc: "2026-09-23T12:00:00Z",
      version: "1.2.3",
      isEnableWss: false,
    },
    {
      id: 11,
      apiUrl: "https://beta.example:9443/",
      suggestedName: "beta",
      publicIp: "10.0.0.11",
      serverType: 1,
      lastSeenUtc: "2026-09-23T13:00:00Z",
      isEnableWss: true,
    },
  ] as Array<Record<string, unknown>>,
}));

vi.mock("react-toastify", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock("../api/orval/vpn-servers/vpn-servers", () => ({
  useGetApiOpenVpnServersDiscoveriesPending: () => ({
    data: { discoveries: pendingState.discoveries },
    isLoading: false,
    isError: false,
    error: null,
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
}));

vi.mock("../api/orval/vpn-servers-v3/vpn-servers-v3", () => ({
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey: () => ["v3-servers"],
}));

import PendingServerDiscoveriesPage from "./PendingServerDiscoveriesPage";

describe("PendingServerDiscoveriesPage", () => {
  beforeEach(() => {
    approveMutateAsync.mockClear();
    denyMutateAsync.mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("lists all pending discoveries", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers/pending-discoveries" element={<PendingServerDiscoveriesPage />} />
      </Routes>,
      { route: "/servers/pending-discoveries" },
    );

    expect(screen.getByRole("heading", { name: /Pending server requests/i })).toBeInTheDocument();
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();
    expect(screen.getByText("http://10.0.0.10:5010/")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Review/i })).toHaveLength(2);
  });

  it("shows empty state when none pending", () => {
    pendingState.discoveries = [];
    renderWithProviders(
      <Routes>
        <Route path="/servers/pending-discoveries" element={<PendingServerDiscoveriesPage />} />
      </Routes>,
      { route: "/servers/pending-discoveries" },
    );
    expect(screen.getByText(/No pending discovery requests/i)).toBeInTheDocument();
    pendingState.discoveries = [
      {
        id: 10,
        apiUrl: "http://10.0.0.10:5010/",
        suggestedName: "alpha",
        publicIp: "10.0.0.10",
        serverType: 0,
        lastSeenUtc: "2026-09-23T12:00:00Z",
        isEnableWss: false,
      },
    ];
  });

  it("quick Add approves and navigates to edit", async () => {
    const user = userEvent.setup();
    pendingState.discoveries = [
      {
        id: 10,
        apiUrl: "http://10.0.0.10:5010/",
        suggestedName: "alpha",
        publicIp: "10.0.0.10",
        serverType: 0,
        isEnableWss: false,
      },
    ];

    renderWithProviders(
      <Routes>
        <Route path="/servers/pending-discoveries" element={<PendingServerDiscoveriesPage />} />
        <Route path="/servers/edit/:serverId" element={<div>Edit page</div>} />
      </Routes>,
      { route: "/servers/pending-discoveries" },
    );

    await user.click(screen.getByRole("button", { name: /^Add$/i }));

    await waitFor(() => {
      expect(approveMutateAsync).toHaveBeenCalledWith({
        discoveryId: 10,
        data: { serverName: "alpha", isEnableWss: false },
      });
    });
    expect(await screen.findByText("Edit page")).toBeInTheDocument();
  });

  it("Reject calls deny", async () => {
    const user = userEvent.setup();
    pendingState.discoveries = [
      {
        id: 10,
        apiUrl: "http://10.0.0.10:5010/",
        suggestedName: "alpha",
        publicIp: "10.0.0.10",
        serverType: 0,
        isEnableWss: false,
      },
    ];

    renderWithProviders(
      <Routes>
        <Route path="/servers/pending-discoveries" element={<PendingServerDiscoveriesPage />} />
      </Routes>,
      { route: "/servers/pending-discoveries" },
    );

    await user.click(screen.getByRole("button", { name: /Reject/i }));
    await waitFor(() => {
      expect(denyMutateAsync).toHaveBeenCalledWith({ discoveryId: 10, data: {} });
    });
  });
});
