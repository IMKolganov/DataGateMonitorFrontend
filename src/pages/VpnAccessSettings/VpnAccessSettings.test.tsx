import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { VpnAccessSettings } from "./VpnAccessSettings";

const createMutate = vi.hoisted(() => vi.fn());
const updateMutate = vi.hoisted(() => vi.fn());
const deleteMutate = vi.hoisted(() => vi.fn());

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../api/orval/vpn-servers-v3/vpn-servers-v3", () => ({
  useGetApiV3OpenVpnServersGetAll: () => ({
    data: {
      vpnServers: [
        { id: 1, serverName: "Helsinki OpenVPN" },
        { id: 2, serverName: "Frankfurt Xray" },
      ],
    },
  }),
  getGetApiV3OpenVpnServersGetAllQueryKey: () => ["/api/v3/open-vpn-servers/get-all"],
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey: () => [
    "/api/v3/open-vpn-servers/get-all-with-status",
  ],
}));

vi.mock("../../api/orval/user/user", () => ({
  useGetApiUsersGetAll: () => ({
    data: {
      users: [
        { id: 10, displayName: "Alice", email: "alice@example.com" },
        { id: 11, displayName: "Bob", email: "bob@example.com" },
      ],
    },
  }),
}));

vi.mock("../../api/orval/user-vpn-server-access-rule/user-vpn-server-access-rule", () => ({
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
    mutate: updateMutate,
    isPending: false,
  }),
  useDeleteApiUserVpnServerAccessRulesDeleteId: () => ({
    mutate: deleteMutate,
    isPending: false,
  }),
}));

vi.mock("../../api/orval/quota-plan/quota-plan", () => ({
  postApiQuotaPlansGetAll: vi.fn(async () => ({
    quotaPlans: [
      { id: 4, name: "Pro", description: "Heavy users (50 GB/day, 300 GB/month)", isActive: true },
      { id: 5, name: "Unlimited", description: "No traffic limits", isActive: true },
    ],
  })),
}));

vi.mock("../../api/orval/quota-plan-allowed-server/quota-plan-allowed-server", () => ({
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

describe("VpnAccessSettings", () => {
  beforeEach(() => {
    createMutate.mockReset();
    updateMutate.mockReset();
    deleteMutate.mockReset();
  });

  it("asks to pick a server before granting access", () => {
    renderWithProviders(<VpnAccessSettings />, { route: "/settings/access" });

    expect(screen.getByRole("heading", { name: "Access" })).toBeInTheDocument();
    expect(screen.getByText(/choose a server to set quota plans/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add people/i })).not.toBeInTheDocument();
  });

  it("lists people with personal rules on the selected server", () => {
    renderWithProviders(<VpnAccessSettings />, { route: "/settings/access?serverId=1" });

    expect(screen.getByRole("heading", { name: "Personal access" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quota plans" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alice (alice@example.com)" })).toHaveAttribute(
      "href",
      "/settings/users/10",
    );
    expect(screen.getByRole("checkbox", { name: "Bob (bob@example.com)" })).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "Alice (alice@example.com)" }),
    ).not.toBeInTheDocument();
  });

  it("grants the selected user access to the server", async () => {
    const user = userEvent.setup();
    renderWithProviders(<VpnAccessSettings />, { route: "/settings/access?serverId=1" });

    await user.click(screen.getByRole("checkbox", { name: "Bob (bob@example.com)" }));
    await user.click(screen.getByRole("button", { name: /add people/i }));

    expect(createMutate).toHaveBeenCalledWith({
      data: { userId: 11, vpnServerId: 1, mode: 1 },
    });
  });

  it("grants several users at once", async () => {
    const user = userEvent.setup();
    renderWithProviders(<VpnAccessSettings />, { route: "/settings/access?serverId=2" });

    await user.click(screen.getByRole("checkbox", { name: "Alice (alice@example.com)" }));
    await user.click(screen.getByRole("checkbox", { name: "Bob (bob@example.com)" }));
    await user.click(screen.getByRole("button", { name: /add 2 people/i }));

    expect(createMutate).toHaveBeenCalledTimes(2);
    expect(createMutate).toHaveBeenCalledWith({
      data: { userId: 10, vpnServerId: 2, mode: 1 },
    });
    expect(createMutate).toHaveBeenCalledWith({
      data: { userId: 11, vpnServerId: 2, mode: 1 },
    });
  });
});
