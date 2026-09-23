import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";

vi.mock("../components/servers/ServerList.tsx", () => ({
  default: ({ onHideList }: { onHideList?: () => void }) => (
    <div data-testid="server-list">
      ServerList
      {onHideList ? (
        <button type="button" onClick={onHideList} aria-label="Hide servers">
          Hide servers
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("../components/servers/ServersGrid.tsx", () => ({
  default: () => <div data-testid="servers-grid">ServersGrid</div>,
}));

const mediaQuery = vi.fn((_q?: { maxWidth?: number }) => false);
vi.mock("react-responsive", () => ({
  useMediaQuery: (q: { maxWidth?: number }) => mediaQuery(q),
}));

import ServersWithDetails from "./ServersWithDetails";

describe("ServersWithDetails", () => {
  beforeEach(() => {
    mediaQuery.mockReturnValue(false);
    try {
      localStorage.removeItem("datagate.serversHomeTab");
    } catch {
      // ignore
    }
  });

  it("renders All servers / Groups / Overview tabs on desktop index", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers" element={<ServersWithDetails />}>
          <Route index element={<div>Overview outlet</div>} />
        </Route>
      </Routes>,
      { route: "/servers" },
    );

    expect(screen.getByRole("tablist", { name: "Servers page view" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /All servers/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Groups/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByTestId("servers-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("server-list")).not.toBeInTheDocument();
  });

  it("switches to Groups and Overview tabs", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/servers" element={<ServersWithDetails />}>
          <Route index element={<div>Overview outlet</div>} />
        </Route>
      </Routes>,
      { route: "/servers" },
    );

    await user.click(screen.getByRole("tab", { name: /Groups/i }));
    expect(screen.getByTestId("server-list")).toBeInTheDocument();
    expect(screen.queryByTestId("servers-grid")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Overview/i }));
    expect(screen.getByText("Overview outlet")).toBeInTheDocument();
    expect(screen.queryByTestId("servers-grid")).not.toBeInTheDocument();
  });

  it("keeps desktop split with hide list when viewing a server", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers" element={<ServersWithDetails />}>
          <Route path=":vpnServerId" element={<div>Details panel</div>} />
        </Route>
      </Routes>,
      { route: "/servers/3" },
    );

    expect(screen.getByTestId("server-list")).toBeInTheDocument();
    expect(screen.getByText("Details panel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide servers" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Servers page view" })).not.toBeInTheDocument();
  });

  it("shows home tabs on mobile servers index", () => {
    mediaQuery.mockReturnValue(true);

    renderWithProviders(
      <Routes>
        <Route path="/servers" element={<ServersWithDetails />}>
          <Route index element={<div>Overview outlet</div>} />
        </Route>
      </Routes>,
      { route: "/servers" },
    );

    expect(screen.getByRole("tablist", { name: "Servers page view" })).toBeInTheDocument();
    expect(screen.getByTestId("servers-grid")).toBeInTheDocument();
  });

  it("uses fullscreen outlet for server details on mobile", () => {
    mediaQuery.mockReturnValue(true);

    renderWithProviders(
      <Routes>
        <Route path="/servers" element={<ServersWithDetails />}>
          <Route path=":vpnServerId" element={<div>Details panel</div>} />
        </Route>
      </Routes>,
      { route: "/servers/3" },
    );

    expect(screen.getByText("Details panel")).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Servers page view" })).not.toBeInTheDocument();
  });
});
