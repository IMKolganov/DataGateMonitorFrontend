import { describe, expect, it } from "vitest";
import { buildPiHolePipelineSteps, firstPiHolePipelineIssue } from "./buildPiHolePipelineSteps";
import type { PiHoleDiagnosticsResponse, VpnServerPiHoleConfigDto } from "../../api/orvalModelShim";

const baseConfig: VpnServerPiHoleConfigDto = {
  vpnServerId: 44,
  baseUrl: "http://127.0.0.1:8080",
  appPassword: "********",
  hasAppPassword: true,
  pollIntervalSeconds: 60,
  batchSize: 200,
  lookbackSeconds: 120,
  clientSubnetPrefix: "10.51.16.",
};

const runningDiagnostics: PiHoleDiagnosticsResponse = {
  checkedAtUtc: "2026-06-22T20:00:00Z",
  enabled: true,
  baseUrl: "http://127.0.0.1:8080",
  hasAppPassword: true,
  pollIntervalSeconds: 60,
  batchSize: 200,
  lookbackSeconds: 120,
  clientSubnetPrefix: "10.51.16.",
  authenticated: true,
  sampleQueryCount: 2,
  collectorRunning: true,
  runtimeConfigAppliedAtUtc: "2026-06-22T19:55:00Z",
  lastPollAtUtc: "2026-06-22T20:00:00Z",
  lastSuccessfulPollAtUtc: "2026-06-22T20:00:00Z",
  lastPollQueriesFetched: 5,
  lastPollQueriesAfterFilter: 3,
  lastPollQueriesEnriched: 3,
  lastPollQueriesForwarded: 3,
  storedQueryCount: 10,
  lastStoredQueryAtUtc: "2026-06-22T20:00:00Z",
  health: "Ok",
};

describe("buildPiHolePipelineSteps", () => {
  it("marks step 3 error when integration on but microservice disabled", () => {
    const steps = buildPiHolePipelineSteps({
      dashboardConfig: baseConfig,
      serverPiHoleEnabled: true,
      serverApiUrl: "https://s6.datagateapp.com/",
      diagnostics: { ...runningDiagnostics, enabled: false, authenticated: false, hasAppPassword: false },
    });

    const runtime = steps.find((s) => s.id === "runtime-push");
    expect(runtime?.status).toBe("error");
    expect(runtime?.error).toContain("disabled");
    expect(firstPiHolePipelineIssue(steps)?.id).toBe("runtime-push");
  });

  it("marks step 1 pending when config not saved", () => {
    const steps = buildPiHolePipelineSteps({
      serverPiHoleEnabled: false,
      serverApiUrl: "https://s6.datagateapp.com/",
    });

    expect(steps[0]?.status).toBe("pending");
    expect(steps[1]?.status).toBe("pending");
    expect(steps[2]?.status).toBe("skipped");
  });

  it("marks full pipeline ok when diagnostics healthy", () => {
    const steps = buildPiHolePipelineSteps({
      dashboardConfig: baseConfig,
      serverPiHoleEnabled: true,
      serverApiUrl: "https://s6.datagateapp.com/",
      diagnostics: runningDiagnostics,
    });

    expect(steps.every((s) => s.status === "ok")).toBe(true);
    expect(steps.find((s) => s.id === "runtime-push")?.status).toBe("ok");
    expect(steps.find((s) => s.id === "pihole-api")?.status).toBe("ok");
  });

  it("marks step 6 as waiting when upstream ok but no dns rows in dashboard yet", () => {
    const steps = buildPiHolePipelineSteps({
      dashboardConfig: baseConfig,
      serverPiHoleEnabled: true,
      serverApiUrl: "https://s4.datagateapp.com/",
      diagnostics: {
        ...runningDiagnostics,
        storedQueryCount: 0,
        lastStoredQueryAtUtc: undefined,
        lastPollQueriesForwarded: 0,
        sampleQueryCount: 5,
      },
    });

    const storage = steps.find((s) => s.id === "storage");
    expect(storage?.status).toBe("ok");
    expect(storage?.statusText).toBe("Waiting for DNS records");
    expect(storage?.summary).toMatch(/waits for DNS query rows/i);
    expect(firstPiHolePipelineIssue(steps)).toBeUndefined();
  });

  it("marks step 3 as From env when enabled without dashboard apply timestamp", () => {
    const steps = buildPiHolePipelineSteps({
      dashboardConfig: baseConfig,
      serverPiHoleEnabled: true,
      serverApiUrl: "https://s6.datagateapp.com/",
      diagnostics: {
        ...runningDiagnostics,
        runtimeConfigAppliedAtUtc: undefined,
      },
    });

    const runtime = steps.find((s) => s.id === "runtime-push");
    expect(runtime?.status).toBe("ok");
    expect(runtime?.statusText).toBe("From env");
    expect(runtime?.summary).toMatch(/PIHOLE_\*/i);
  });

  it("surfaces probe auth failure on step 4", () => {
    const steps = buildPiHolePipelineSteps({
      dashboardConfig: baseConfig,
      serverPiHoleEnabled: true,
      serverApiUrl: "https://s6.datagateapp.com/",
      diagnostics: {
        ...runningDiagnostics,
        error: "Pi-hole auth HTTP 401",
        authenticated: false,
      },
    });

    const api = steps.find((s) => s.id === "pihole-api");
    expect(api?.status).toBe("error");
    expect(api?.error).toContain("401");
  });
});
