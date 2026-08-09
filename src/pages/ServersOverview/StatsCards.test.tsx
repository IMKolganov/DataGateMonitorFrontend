import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import StatsCards from "./StatsCards";

const totals = {
  sessionsCount: 12,
  usersCount: 3,
  trafficInBytes: 1024,
  trafficOutBytes: 2048,
  trafficTotalBytes: 3072,
};

describe("StatsCards", () => {
  it("renders totals from props", () => {
    renderWithProviders(<StatsCards totals={totals} />);

    expect(screen.getByText("Users (unique externalId)")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Traffic TOTAL")).toBeInTheDocument();
  });

  it("shows Loading status card when loading", () => {
    renderWithProviders(<StatsCards totals={totals} loading />);

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
