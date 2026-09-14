import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";
import ServerAccessTab from "./ServerAccessTab";

const createMutate = vi.hoisted(() => vi.fn());

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, roles: ["Admin"] }),
  isAdmin: () => true,
}));

vi.mock("../api/orval/vpn-servers-v3/vpn-servers-v3", () => ({
  getGetApiV3OpenVpnServersGetAllQueryKey: () => ["/api/v3/open-vpn-servers/get-all"],
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey: () => [
    "/api/v3/open-vpn-servers/get-all-with-status",
  ],
}));

vi.mock("../api/orval/user/user", () => ({
  useGetApiUsersGetAll: () => ({
    data: {
      users: [
        { id: 10, displayName: "Alice", email: "alice@example.com" },
        { id: 11, displayName: "Bob", email: "bob@example.com" },
      ],
    },
  }),
}));

vi.mock("../api/orval/user-vpn-server-access-rule/user-vpn-server-access-rule", () => ({
  useGetApiUserVpnServerAccessRulesGetByVpnServerIdVpnServerId: (vpnServerId: number) => ({
    data:
      vpnServerId === 1
        ? { items: [{ id: 1, userId: 10, vpnServerId: 1, mode: 1 }] }
        : { items: [] },
  }),
  usePostApiUserVpnServerAccessRulesCreate: () => ({
    mutate: createMutate,
    mutateAsync: createMutate,
    isPending: false,
  }),
  usePutApiUserVpnServerAccessRulesUpdate: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteApiUserVpnServerAccessRulesDeleteId: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("../api/orval/quota-plan/quota-plan", () => ({
  postApiQuotaPlansGetAll: vi.fn(async () => ({
    quotaPlans: [
      { id: 4, name: "Pro", description: "Heavy users (50 GB/day, 300 GB/month)", isActive: true },
      { id: 5, name: "Unlimited", description: "No traffic limits", isActive: true },
    ],
  })),
}));

vi.mock("../api/orval/quota-plan-allowed-server/quota-plan-allowed-server", () => ({
  getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey: (id: number) => [
    `/api/quota-plan-allowed-servers/get-by-vpn-server-id/${id}`,
  ],
  useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId: () => ({
    data: { items: [] },
  }),
  usePostApiQuotaPlanAllowedServersCreate: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteApiQuotaPlanAllowedServersDeleteId: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("ServerAccessTab", () => {
  beforeEach(() => {
    createMutate.mockReset();
  });

  it("grants access on the opened server without a server picker", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/servers/:vpnServerId/access" element={<ServerAccessTab />} />
      </Routes>,
      { route: "/servers/1/access" },
    );

    expect(screen.queryByLabelText("VPN server")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alice (alice@example.com)" })).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Bob (bob@example.com)" }));
    await user.click(screen.getByRole("button", { name: /add people/i }));

    expect(createMutate).toHaveBeenCalledWith({
      data: { userId: 11, vpnServerId: 1, mode: 1 },
    });
  });
});
