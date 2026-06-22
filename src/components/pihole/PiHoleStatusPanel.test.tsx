import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PiHoleStatusPanel } from "./PiHoleStatusPanel";
import type { PiHoleDiagnosticsResponse } from "../../api/orvalModelShim";

const healthy: PiHoleDiagnosticsResponse = {
  health: "Ok",
  healthMessage: "Last poll forwarded 2 queries; 10 stored in DB.",
  checkedAtUtc: "2026-06-22T12:00:00Z",
  baseUrl: "http://pi-hole:8080",
  authenticated: true,
  hasAppPassword: true,
  collectorRunning: true,
  pollIntervalSeconds: 60,
  batchSize: 200,
  lookbackSeconds: 120,
  clientSubnetPrefix: "10.51.30.",
  sampleQueryCount: 2,
  lastPollQueriesFetched: 5,
  lastPollQueriesAfterFilter: 2,
  lastPollQueriesEnriched: 2,
  lastPollQueriesForwarded: 2,
  storedQueryCount: 10,
};

describe("PiHoleStatusPanel", () => {
  it("shows loading state", () => {
    render(<PiHoleStatusPanel diagnostics={null} loading />);
    expect(screen.getByText(/Loading diagnostics/i)).toBeInTheDocument();
  });

  it("shows error state", () => {
    render(<PiHoleStatusPanel diagnostics={null} error="Upstream failed" onRefresh={() => undefined} />);
    expect(screen.getByText("Upstream failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
  });

  it("renders health badge and metrics", () => {
    render(<PiHoleStatusPanel diagnostics={healthy} onRefresh={() => undefined} />);

    expect(screen.getByText("Ok")).toBeInTheDocument();
    expect(screen.getByText(/Last poll forwarded 2 queries/i)).toBeInTheDocument();
    expect(screen.getByText("http://pi-hole:8080")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("shows probe and poll error alerts", () => {
    render(
      <PiHoleStatusPanel
        diagnostics={{
          ...healthy,
          health: "Error",
          error: "auth failed",
          lastPollError: "timeout",
        }}
      />,
    );

    expect(screen.getByText(/Probe error:/i)).toBeInTheDocument();
    expect(screen.getByText(/Last poll error:/i)).toBeInTheDocument();
    expect(screen.getByText("auth failed")).toBeInTheDocument();
    expect(screen.getByText("timeout")).toBeInTheDocument();
  });
});
