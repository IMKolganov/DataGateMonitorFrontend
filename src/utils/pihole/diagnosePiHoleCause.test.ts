import { describe, expect, it } from "vitest";
import { diagnosePiHoleCause } from "./diagnosePiHoleCause";
import type { PiHoleDiagnosticsResponse, VpnServerPiHoleConfigDto } from "../../api/orvalModelShim";

const unsaved: VpnServerPiHoleConfigDto = { vpnServerId: 136, baseUrl: "", hasAppPassword: false };
const saved: VpnServerPiHoleConfigDto = { vpnServerId: 136, baseUrl: "http://10.51.102.1:8080", hasAppPassword: true };

const node = (overrides: Partial<PiHoleDiagnosticsResponse>): PiHoleDiagnosticsResponse => ({
  enabled: false,
  hasAppPassword: false,
  authenticated: false,
  ...overrides,
});

describe("diagnosePiHoleCause", () => {
  it("blames the install when neither side has credentials", () => {
    const cause = diagnosePiHoleCause({
      dashboardConfig: unsaved,
      serverPiHoleEnabled: true,
      diagnostics: node({}),
    });

    expect(cause?.message).toContain("no Pi-hole credentials");
    expect(cause?.fix).toContain("~/openvpn-tcp-wss");
  });

  it("names the Xray stack directory in the host fix", () => {
    const cause = diagnosePiHoleCause({
      dashboardConfig: unsaved,
      serverPiHoleEnabled: true,
      diagnostics: node({}),
      stack: "xray",
    });

    expect(cause?.fix).toContain("~/datagate-monitor-xray");
  });

  it("reports credentials that never reached the dashboard, also on nodes without the new fields", () => {
    const cause = diagnosePiHoleCause({
      dashboardConfig: unsaved,
      serverPiHoleEnabled: true,
      diagnostics: node({ hasAppPassword: true }),
    });

    expect(cause?.message).toContain("never reached the dashboard");
  });

  it.each([
    ["OmittedInsecureBackend", "not HTTPS"],
    ["BackendNotConfigured", "no valid backend URL"],
  ])("explains announce state %s", (announceState, expected) => {
    const cause = diagnosePiHoleCause({
      dashboardConfig: unsaved,
      serverPiHoleEnabled: true,
      diagnostics: node({ hasAppPassword: true, announceState }),
    });

    expect(cause?.message).toContain(expected);
  });

  it("reports saved settings that were not applied", () => {
    const cause = diagnosePiHoleCause({
      dashboardConfig: saved,
      serverPiHoleEnabled: true,
      diagnostics: node({}),
    });

    expect(cause?.fix).toBe("Click Save & apply.");
  });

  it("does not treat a disabled integration as a fault", () => {
    expect(
      diagnosePiHoleCause({ dashboardConfig: saved, serverPiHoleEnabled: false, diagnostics: node({}) }),
    ).toBeNull();
  });

  it("explains environment variables that override the dashboard", () => {
    const cause = diagnosePiHoleCause({
      dashboardConfig: saved,
      serverPiHoleEnabled: true,
      diagnostics: node({ enabled: true, hasAppPassword: true, credentialSource: "Env" }),
    });

    expect(cause?.message).toContain("override the dashboard");
  });

  it("stays quiet when the node is healthy", () => {
    expect(
      diagnosePiHoleCause({
        dashboardConfig: saved,
        serverPiHoleEnabled: true,
        diagnostics: node({ enabled: true, hasAppPassword: true, authenticated: true, credentialSource: "Dashboard" }),
      }),
    ).toBeNull();
  });

  it("says the cause is unknown when the node is unreachable", () => {
    const cause = diagnosePiHoleCause({
      dashboardConfig: unsaved,
      serverPiHoleEnabled: true,
      diagnosticsFetchError: "Network error",
    });

    expect(cause?.message).toContain("cannot be determined");
  });

  it("waits while diagnostics are still loading", () => {
    expect(diagnosePiHoleCause({ dashboardConfig: unsaved, serverPiHoleEnabled: true })).toBeNull();
  });
});
