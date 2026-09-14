import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ServerQuotaPlansPanel } from "./ServerQuotaPlansPanel";

const createMutate = vi.hoisted(() => vi.fn(async () => ({})));
const deleteMutate = vi.hoisted(() => vi.fn(async () => ({})));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../api/orval/quota-plan/quota-plan", () => ({
  postApiQuotaPlansGetAll: vi.fn(async () => ({
    quotaPlans: [
      {
        id: 3,
        name: "Standard",
        description: "Balanced plan (20 GB/day, 100 GB/month)",
        isActive: true,
      },
      {
        id: 4,
        name: "Pro",
        description: "Heavy users (50 GB/day, 300 GB/month)",
        isActive: true,
      },
      {
        id: 5,
        name: "Unlimited",
        description: "No traffic limits",
        isActive: true,
      },
    ],
  })),
}));

vi.mock("../../api/orval/quota-plan-allowed-server/quota-plan-allowed-server", () => ({
  getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey: (id: number) => [
    `/api/quota-plan-allowed-servers/get-by-vpn-server-id/${id}`,
  ],
  useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId: () => ({
    data: { items: [{ id: 99, quotaPlanId: 4, vpnServerId: 1 }] },
  }),
  usePostApiQuotaPlanAllowedServersCreate: () => ({
    mutateAsync: createMutate,
    isPending: false,
  }),
  useDeleteApiQuotaPlanAllowedServersDeleteId: () => ({
    mutateAsync: deleteMutate,
    isPending: false,
  }),
}));

vi.mock("../../api/orval/vpn-servers-v3/vpn-servers-v3", () => ({
  getGetApiV3OpenVpnServersGetAllQueryKey: () => ["/api/v3/open-vpn-servers/get-all"],
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey: () => [
    "/api/v3/open-vpn-servers/get-all-with-status",
  ],
}));

describe("ServerQuotaPlansPanel", () => {
  beforeEach(() => {
    createMutate.mockReset();
    deleteMutate.mockReset();
  });

  it("lists every quota plan with its description and current allowlist", async () => {
    renderWithProviders(<ServerQuotaPlansPanel vpnServerId={1} />);

    expect(await screen.findByRole("checkbox", { name: "Standard" })).toBeInTheDocument();
    expect(screen.getByText(/balanced plan/i)).toBeInTheDocument();
    expect(screen.getByText(/heavy users/i)).toBeInTheDocument();
    expect(screen.getByText(/no traffic limits/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Pro" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Unlimited" })).not.toBeChecked();
  });

  it("adds and removes the server from a quota plan", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServerQuotaPlansPanel vpnServerId={1} />);

    await screen.findByRole("checkbox", { name: "Unlimited" });
    await user.click(screen.getByRole("checkbox", { name: "Unlimited" }));
    expect(createMutate).toHaveBeenCalledWith({
      data: { quotaPlanId: 5, vpnServerId: 1 },
    });

    await user.click(screen.getByRole("checkbox", { name: "Pro" }));
    expect(deleteMutate).toHaveBeenCalledWith({ id: 99 });
  });
});
