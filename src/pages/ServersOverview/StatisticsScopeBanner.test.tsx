import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { StatisticsScopeBanner } from "./StatisticsScopeBanner";

describe("StatisticsScopeBanner", () => {
  it("describes all servers when unscoped", () => {
    renderWithProviders(<StatisticsScopeBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/all VPN servers/i);
    expect(screen.getByRole("status")).toHaveTextContent(/all users/i);
  });

  it("links to servers list for user-only scope", () => {
    renderWithProviders(<StatisticsScopeBanner externalId="ext-1" userDisplayName="Ada" />);
    expect(screen.getByRole("status")).toHaveTextContent(/Ada/);
    expect(screen.getByRole("link", { name: /servers list/i })).toHaveAttribute("href", "/servers");
  });
});
