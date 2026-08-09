import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";

vi.mock("../components/servers/ServerList.tsx", () => ({
  default: () => <div data-testid="server-list">ServerList</div>,
}));

const mediaQuery = vi.fn(() => false);
vi.mock("react-responsive", () => ({
  useMediaQuery: (q: { maxWidth?: number }) => mediaQuery(q),
}));

import ServersWithDetails from "./ServersWithDetails";

describe("ServersWithDetails", () => {
  beforeEach(() => {
    mediaQuery.mockReturnValue(false);
  });

  it("renders server list and outlet on desktop", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers" element={<ServersWithDetails />}>
          <Route index element={<div>Overview outlet</div>} />
        </Route>
      </Routes>,
      { route: "/servers" },
    );

    expect(screen.getByTestId("server-list")).toBeInTheDocument();
    expect(screen.getByText("Overview outlet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "⬅" })).toBeInTheDocument();
  });

  it("shows mobile Servers/Overview tablist on servers index", () => {
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
    expect(screen.getByRole("tab", { name: "Servers" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
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
    expect(screen.queryByRole("tablist", { name: "Servers page view" })).not.toBeInTheDocument();
  });
});
