import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PiHoleStatusPanel } from "./PiHoleStatusPanel";
import type { PiHoleDiagnosticsResponse, VpnServerPiHoleConfigDto } from "../../api/orvalModelShim";

const dashboardConfig: VpnServerPiHoleConfigDto = {
  vpnServerId: 44,
  baseUrl: "http://127.0.0.1:8080",
  appPassword: "********",
  hasAppPassword: true,
  pollIntervalSeconds: 60,
  batchSize: 200,
  lookbackSeconds: 120,
  clientSubnetPrefix: "10.51.16.",
};

const healthy: PiHoleDiagnosticsResponse = {
  enabled: true,
  health: "Ok",
  healthMessage: "Last poll forwarded 2 queries; 10 stored in DB.",
  checkedAtUtc: "2026-06-22T12:00:00Z",
  baseUrl: "http://127.0.0.1:8080",
  authenticated: true,
  hasAppPassword: true,
  collectorRunning: true,
  pollIntervalSeconds: 60,
  batchSize: 200,
  lookbackSeconds: 120,
  clientSubnetPrefix: "10.51.16.",
  sampleQueryCount: 2,
  lastPollQueriesFetched: 5,
  lastPollQueriesAfterFilter: 2,
  lastPollQueriesEnriched: 2,
  lastPollQueriesForwarded: 2,
  storedQueryCount: 10,
  runtimeConfigAppliedAtUtc: "2026-06-22T11:55:00Z",
  lastSuccessfulPollAtUtc: "2026-06-22T12:00:00Z",
};

describe("PiHoleStatusPanel", () => {
  it("shows loading state", () => {
    render(<PiHoleStatusPanel loading serverPiHoleEnabled={false} />);
    expect(screen.getByText(/Pi-hole integration/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText("loading").length).toBeGreaterThan(0);
  });

  it("shows fetch error", () => {
    render(
      <PiHoleStatusPanel
        diagnostics={null}
        error="Upstream failed"
        serverPiHoleEnabled
        onRefresh={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
    const alerts = screen.getAllByRole("alert");
    expect(alerts.some((el) => el.textContent?.includes("Step 3: Runtime on OpenVPN microservice"))).toBe(true);
    expect(alerts.some((el) => el.textContent?.includes("Upstream failed"))).toBe(true);
  });

  it("names the likely cause when neither the dashboard nor the node has credentials", () => {
    render(
      <PiHoleStatusPanel
        dashboardConfig={{ vpnServerId: 136, baseUrl: "", hasAppPassword: false }}
        serverPiHoleEnabled
        diagnostics={{ enabled: false, hasAppPassword: false, authenticated: false }}
      />,
    );

    expect(screen.getByRole("note")).toHaveTextContent(/Likely cause:.*no Pi-hole credentials/);
    expect(screen.queryByText(/Base URL is saved/)).not.toBeInTheDocument();
  });

  it("shows no cause for a healthy node", () => {
    render(
      <PiHoleStatusPanel dashboardConfig={dashboardConfig} serverPiHoleEnabled diagnostics={healthy} />,
    );

    expect(screen.queryByText(/Likely cause:/)).not.toBeInTheDocument();
  });

  it("renders pipeline steps from diagnostics", () => {
    render(
      <PiHoleStatusPanel
        dashboardConfig={dashboardConfig}
        serverPiHoleEnabled
        serverApiUrl="https://s6.datagateapp.com/"
        diagnostics={healthy}
        onRefresh={() => undefined}
      />,
    );

    expect(screen.getByText(/Pi-hole integration/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Dashboard configuration:/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Pi-hole API:/i)).toBeInTheDocument();
    expect(screen.getByText(/authenticated, 2 sample queries/i)).toBeInTheDocument();
    expect(screen.getByText(/✅ OK/i)).toBeInTheDocument();
  });

  it("highlights runtime step error when collector disabled", () => {
    render(
      <PiHoleStatusPanel
        dashboardConfig={dashboardConfig}
        serverPiHoleEnabled
        serverApiUrl="https://s6.datagateapp.com/"
        diagnostics={{ ...healthy, enabled: false, authenticated: false, hasAppPassword: false }}
      />,
    );

    const alerts = screen.getAllByRole("alert");
    expect(alerts.some((el) => el.textContent?.includes("Collector is disabled on the OpenVPN microservice"))).toBe(
      true,
    );
  });
});
