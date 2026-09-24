import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";

const approveMutateAsync = vi.hoisted(() =>
  vi.fn(async () => ({ vpnServerId: 77, discovery: { id: 5, status: 1 } })),
);
const denyMutateAsync = vi.hoisted(() => vi.fn(async () => ({})));

vi.mock("react-toastify", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock("../api/orval/vpn-servers/vpn-servers", () => ({
  useGetApiOpenVpnServersDiscoveriesPending: () => ({
    data: {
      discoveries: [
        {
          id: 5,
          apiUrl: "http://203.0.113.10:5010/",
          suggestedName: "xray-node",
          publicIp: "203.0.113.10",
          serverType: 1,
          isEnableWss: true,
          version: "9.9.9",
        },
      ],
    },
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

vi.mock("../api/orval/vpn-servers-v3/vpn-servers-v3", () => ({
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey: () => ["v3-servers"],
}));

vi.mock("../api/orval/tags/tags", () => ({
  useGetApiTagsGetAll: () => ({ data: { tags: [{ id: 1, name: "eu" }] } }),
}));

vi.mock("../api/orval/quota-plan/quota-plan", () => ({
  usePostApiQuotaPlansGetAll: () => ({
    mutateAsync: vi.fn(async () => ({ quotaPlans: [{ id: 3, name: "Free", isActive: true }] })),
    isPending: false,
  }),
}));

vi.mock("../api/orval/quota-plan-allowed-server/quota-plan-allowed-server", () => ({
  getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey: (id: number) => [
    "allowed",
    id,
  ],
}));

import PendingServerDiscoveryReviewPage from "./PendingServerDiscoveryReviewPage";

describe("PendingServerDiscoveryReviewPage", () => {
  beforeEach(() => {
    approveMutateAsync.mockClear();
    denyMutateAsync.mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("prefills discovery and approves with edited ApiUrl", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route
          path="/servers/pending-discoveries/:discoveryId"
          element={<PendingServerDiscoveryReviewPage />}
        />
        <Route path="/servers/edit/:serverId" element={<div>Edited</div>} />
      </Routes>,
      { route: "/servers/pending-discoveries/5" },
    );

    expect(await screen.findByRole("heading", { name: /Review server request/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("xray-node")).toBeInTheDocument();
    expect(screen.getByDisplayValue("http://203.0.113.10:5010/")).toBeInTheDocument();

    const apiUrl = screen.getByLabelText(/API URL/i);
    await user.clear(apiUrl);
    await user.type(apiUrl, "https://xray.example.com:9443/");

    await user.click(screen.getByRole("button", { name: /Approve & add/i }));

    await waitFor(() => {
      expect(approveMutateAsync).toHaveBeenCalled();
    });
    const call = approveMutateAsync.mock.calls[0][0];
    expect(call.discoveryId).toBe(5);
    expect(call.data.serverName).toBe("xray-node");
    expect(call.data.apiUrl).toBe("https://xray.example.com:9443/");
    expect(call.data.isEnableWss).toBe(true);
    expect(await screen.findByText("Edited")).toBeInTheDocument();
  });

  it("shows missing state for unknown discovery id", async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/servers/pending-discoveries/:discoveryId"
          element={<PendingServerDiscoveryReviewPage />}
        />
      </Routes>,
      { route: "/servers/pending-discoveries/999" },
    );

    expect(
      await screen.findByText(/not pending anymore/i),
    ).toBeInTheDocument();
  });

  it("Reject calls deny and returns to list", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route
          path="/servers/pending-discoveries/:discoveryId"
          element={<PendingServerDiscoveryReviewPage />}
        />
        <Route path="/servers/pending-discoveries" element={<div>List</div>} />
      </Routes>,
      { route: "/servers/pending-discoveries/5" },
    );

    await screen.findByRole("heading", { name: /Review server request/i });
    await user.click(screen.getByRole("button", { name: /^Reject$/i }));

    await waitFor(() => {
      expect(denyMutateAsync).toHaveBeenCalledWith({ discoveryId: 5, data: {} });
    });
    expect(await screen.findByText("List")).toBeInTheDocument();
  });
});
