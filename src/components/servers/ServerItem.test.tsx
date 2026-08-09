import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import ServerItem from "./ServerItem";

const authState = vi.hoisted(() => ({ admin: true }));
vi.mock("../../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, roles: authState.admin ? ["Admin"] : ["VpnUser"] }),
  isAdmin: () => authState.admin,
}));
vi.mock("./VpnStackLogo", () => ({ VpnStackLogo: () => <span data-testid="stack-logo" /> }));

function baseServer(overrides: Record<string, unknown> = {}) {
  return {
    vpnServerResponses: {
      vpnServer: {
        id: 12,
        serverName: "Edge-12",
        isOnline: true,
        serverType: 0,
        isDefault: false,
        isDisabled: false,
        ...overrides,
      },
    },
    countConnectedClients: 3,
    countSessions: 1,
  };
}

describe("ServerItem", () => {
  beforeEach(() => {
    authState.admin = true;
  });

  it("renders name, online badge, and admin actions", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <ServerItem
        server={baseServer() as never}
        vpnServerId={12}
        serviceStatus={1}
        errorMessage={null}
        nextRunTime="N/A"
        wsOnline={null}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText(/\(12\) Edge-12/)).toBeInTheDocument();
    expect(screen.getByText(/Online/i)).toBeInTheDocument();
    expect(screen.getByText(/Status Name: Running/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /View/i }));
    await user.click(screen.getByRole("button", { name: /Edit/i }));
    await user.click(screen.getByRole("button", { name: /Delete/i }));
    expect(onView).toHaveBeenCalledWith(12);
    expect(onEdit).toHaveBeenCalledWith(12);
    expect(onDelete).toHaveBeenCalledWith(12);
  });

  it("disables edit/delete for non-admins", () => {
    authState.admin = false;
    render(
      <ServerItem
        server={baseServer() as never}
        vpnServerId={12}
        serviceStatus={null}
        errorMessage={null}
        nextRunTime="N/A"
        wsOnline={false}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText(/Offline/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /View/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Edit/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Delete/i })).toBeDisabled();
  });
});
