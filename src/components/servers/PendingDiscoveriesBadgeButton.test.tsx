import { describe, expect, it, vi, beforeEach } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";

const authState = vi.hoisted(() => ({ admin: true }));
const pendingCount = vi.hoisted(() => ({ n: 2 }));

vi.mock("../../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, roles: authState.admin ? ["Admin"] : ["VpnUser"] }),
  isAdmin: () => authState.admin,
}));

vi.mock("../../api/orval/vpn-servers/vpn-servers", () => ({
  useGetApiOpenVpnServersDiscoveriesPending: () => ({
    data: {
      discoveries: Array.from({ length: pendingCount.n }, (_, i) => ({
        id: i + 1,
        apiUrl: `http://10.0.0.${i + 1}/`,
      })),
    },
  }),
}));

import { PendingDiscoveriesBadgeButton } from "./PendingDiscoveriesBadgeButton";

describe("PendingDiscoveriesBadgeButton", () => {
  beforeEach(() => {
    authState.admin = true;
    pendingCount.n = 2;
  });

  it("shows count and navigates to inbox", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/servers" element={<PendingDiscoveriesBadgeButton />} />
        <Route path="/servers/pending-discoveries" element={<div>Pending inbox</div>} />
      </Routes>,
      { route: "/servers" },
    );

    expect(screen.getByRole("button", { name: /Pending \(2\)/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Pending \(2\)/i }));
    expect(await screen.findByText("Pending inbox")).toBeInTheDocument();
  });

  it("hides when no pending", () => {
    pendingCount.n = 0;
    renderWithProviders(<PendingDiscoveriesBadgeButton />, { route: "/servers" });
    expect(screen.queryByRole("button", { name: /Pending/i })).not.toBeInTheDocument();
  });

  it("hides for non-admin", () => {
    authState.admin = false;
    renderWithProviders(<PendingDiscoveriesBadgeButton />, { route: "/servers" });
    expect(screen.queryByRole("button", { name: /Pending/i })).not.toBeInTheDocument();
  });
});
