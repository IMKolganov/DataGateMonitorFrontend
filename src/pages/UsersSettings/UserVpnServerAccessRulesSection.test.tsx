import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { UserVpnServerAccessRulesSection } from "./UserVpnServerAccessRulesSection";

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
}));

vi.mock("../../api/orval/user-vpn-server-access-rule/user-vpn-server-access-rule", () => ({
  useGetApiUserVpnServerAccessRulesGetByUserIdUserId: () => ({
    data: {
      items: [{ id: 1, userId: 10, vpnServerId: 1, mode: 1 }],
    },
  }),
  usePostApiUserVpnServerAccessRulesCreate: () => ({
    mutate: createMutate,
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

describe("UserVpnServerAccessRulesSection", () => {
  beforeEach(() => {
    createMutate.mockReset();
    updateMutate.mockReset();
    deleteMutate.mockReset();
  });

  it("lists personal rules and links to Access settings", () => {
    renderWithProviders(<UserVpnServerAccessRulesSection userId={10} />);

    expect(screen.getByRole("heading", { name: /personal vpn server access/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Access settings" })).toHaveAttribute("href", "/settings/access");
    expect(screen.getByText("Helsinki OpenVPN")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Rule for Helsinki OpenVPN" })).toHaveValue("1");
  });

  it("adds a grant for a server that does not yet have a rule", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserVpnServerAccessRulesSection userId={10} />);

    await user.selectOptions(screen.getByDisplayValue("Select server…"), "2");
    await user.click(screen.getByRole("button", { name: /add rule/i }));

    expect(createMutate).toHaveBeenCalledWith(
      { data: { userId: 10, vpnServerId: 2, mode: 1 } },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("toggles grant to block", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserVpnServerAccessRulesSection userId={10} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Rule for Helsinki OpenVPN" }), "2");

    expect(updateMutate).toHaveBeenCalledWith(
      { data: { id: 1, userId: 10, vpnServerId: 1, mode: 2 } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("removes a rule after confirm", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderWithProviders(<UserVpnServerAccessRulesSection userId={10} />);

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(confirm).toHaveBeenCalled();
    expect(deleteMutate).toHaveBeenCalledWith(
      { id: 1 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    confirm.mockRestore();
  });
});
