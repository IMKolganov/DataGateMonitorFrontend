import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { UserStatisticsAccessDenied } from "./UserStatisticsAccessDenied";

describe("UserStatisticsAccessDenied", () => {
  it("shows access-restricted copy and link to aggregate stats", () => {
    renderWithProviders(<UserStatisticsAccessDenied />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Access restricted")).toBeInTheDocument();
    expect(
      screen.getByText("Your role does not allow viewing other users' statistics."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to aggregate statistics/i })).toHaveAttribute(
      "href",
      "/servers",
    );
  });

  it("links back to server statistics when vpnServerId is set", () => {
    renderWithProviders(<UserStatisticsAccessDenied vpnServerId={7} />);

    expect(screen.getByRole("link", { name: /Back to aggregate statistics/i })).toHaveAttribute(
      "href",
      "/servers/7/statistics",
    );
  });
});
