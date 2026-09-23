import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
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

const mediaQuery = vi.fn((_q?: { maxWidth?: number }) => false);
vi.mock("react-responsive", () => ({
  useMediaQuery: (q: { maxWidth?: number }) => mediaQuery(q),
}));

import ServersWithDetails from "./ServersWithDetails";

describe("ServersWithDetails", () => {
  beforeEach(() => {
    mediaQuery.mockReturnValue(false);
  });

  it("renders full-width grouped server list on desktop index", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers" element={<ServersWithDetails />}>
          <Route index element={null} />
        </Route>
      </Routes>,
      { route: "/servers" },
    );

    expect(screen.getByTestId("server-list")).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Servers page view" })).not.toBeInTheDocument();
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
  });

  it("shows server list on mobile servers index", () => {
    mediaQuery.mockReturnValue(true);

    renderWithProviders(
      <Routes>
        <Route path="/servers" element={<ServersWithDetails />}>
          <Route index element={null} />
        </Route>
      </Routes>,
      { route: "/servers" },
    );

    expect(screen.getByTestId("server-list")).toBeInTheDocument();
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
    expect(screen.queryByTestId("server-list")).not.toBeInTheDocument();
  });
});
