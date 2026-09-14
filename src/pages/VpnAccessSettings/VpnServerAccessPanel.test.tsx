import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { VpnServerAccessPanel } from "./VpnServerAccessPanel";

const createMutateAsync = vi.hoisted(() => vi.fn());
const updateMutate = vi.hoisted(() => vi.fn());
const deleteMutate = vi.hoisted(() => vi.fn());

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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
  useGetApiUserVpnServerAccessRulesGetByVpnServerIdVpnServerId: () => ({
    data: { items: [{ id: 1, userId: 10, vpnServerId: 1, mode: 1 }] },
  }),
  usePostApiUserVpnServerAccessRulesCreate: () => ({
    mutate: createMutateAsync,
    mutateAsync: createMutateAsync,
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

describe("VpnServerAccessPanel", () => {
  beforeEach(() => {
    createMutateAsync.mockReset().mockResolvedValue({});
    updateMutate.mockReset();
    deleteMutate.mockReset();
  });

  it("renders existing rules and hides those users from the picker", () => {
    renderWithProviders(<VpnServerAccessPanel vpnServerId={1} title="Helsinki" />);

    expect(screen.getByRole("heading", { name: "Helsinki" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alice (alice@example.com)" })).toHaveAttribute(
      "href",
      "/settings/users/10",
    );
    expect(screen.getByRole("checkbox", { name: "Bob (bob@example.com)" })).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "Alice (alice@example.com)" }),
    ).not.toBeInTheDocument();
  });

  it("grants the selected user access", async () => {
    const user = userEvent.setup();
    renderWithProviders(<VpnServerAccessPanel vpnServerId={1} />);

    await user.click(screen.getByRole("checkbox", { name: "Bob (bob@example.com)" }));
    await user.click(screen.getByRole("button", { name: /add people/i }));

    expect(createMutateAsync).toHaveBeenCalledWith({
      data: { userId: 11, vpnServerId: 1, mode: 1 },
    });
  });

  it("toggles a rule to block", async () => {
    const user = userEvent.setup();
    renderWithProviders(<VpnServerAccessPanel vpnServerId={1} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Rule for Alice (alice@example.com)" }),
      "2",
    );

    expect(updateMutate).toHaveBeenCalledWith(
      { data: { id: 1, userId: 10, vpnServerId: 1, mode: 2 } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("returns nothing when vpnServerId is unset", () => {
    const { container } = renderWithProviders(<VpnServerAccessPanel vpnServerId={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
