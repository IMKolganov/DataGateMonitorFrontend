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

  it("xray stack: step 3 is Xray node runtime (same pattern as OpenVPN)", () => {
    const steps = buildPiHolePipelineSteps({
      dashboardConfig: baseConfig,
      serverPiHoleEnabled: true,
      serverApiUrl: "https://xs2.datagateapp.com/",
      diagnostics: runningDiagnostics,
      stack: "xray",
    });

    const runtime = steps.find((s) => s.id === "runtime-push");
    expect(runtime?.title).toMatch(/Xray/i);
    expect(runtime?.status).toBe("ok");
    expect(runtime?.flow).toMatch(/DataGateXRayManager/);
    expect(runtime?.summary).toMatch(/CN/i);
    expect(steps.find((s) => s.id === "collector")?.flow).toMatch(/SignalR/i);
    expect(steps.find((s) => s.id === "storage")?.title).toMatch(/query log/i);
  });

  it("xray stack: storage waiting copy mentions IdentityIp / CN", () => {
    const steps = buildPiHolePipelineSteps({
      dashboardConfig: baseConfig,
      serverPiHoleEnabled: true,
      serverApiUrl: "https://xs2.datagateapp.com/",
      diagnostics: {
        ...runningDiagnostics,
        storedQueryCount: 0,
        lastStoredQueryAtUtc: undefined,
        lastPollQueriesForwarded: 0,
      },
      stack: "xray",
    });

    const storage = steps.find((s) => s.id === "storage");
    expect(storage?.status).toBe("ok");
    expect(storage?.summary).toMatch(/IdentityIp/i);
    expect(storage?.summary).toMatch(/CN/i);
  });

  it("xray stack: collector poll error uses Xray node fix copy", () => {
    const steps = buildPiHolePipelineSteps({
      dashboardConfig: baseConfig,
      serverPiHoleEnabled: true,
      serverApiUrl: "https://xs2.datagateapp.com/",
      diagnostics: {
        ...runningDiagnostics,
        lastPollError: "Pi-hole auth HTTP 401",
        collectorRunning: true,
      },
      stack: "xray",
    });

    const collector = steps.find((s) => s.id === "collector");
    expect(collector?.status).toBe("error");
    expect(collector?.fix).toMatch(/Xray manager|PiHoleQueryCollector/i);
  });

  it("ignores collector poll error recorded before last Save & apply", () => {
    const steps = buildPiHolePipelineSteps({
      dashboardConfig: {
        ...baseConfig,
        baseUrl: "http://host.docker.internal:8080",
      },
      serverPiHoleEnabled: true,
      serverApiUrl: "https://xs2.datagateapp.com/",
      diagnostics: {
        ...runningDiagnostics,
        baseUrl: "http://host.docker.internal:8080",
        authenticated: true,
        sampleQueryCount: 5,
        collectorRunning: true,
        runtimeConfigAppliedAtUtc: "2026-08-16T12:10:23Z",
        lastPollAtUtc: "2026-08-16T12:09:00Z",
        lastSuccessfulPollAtUtc: undefined,
        lastPollError: "Connection refused (127.0.0.1:8080)",
        lastPollQueriesForwarded: 0,
        storedQueryCount: 0,
      },
      stack: "xray",
    });

    const collector = steps.find((s) => s.id === "collector");
    expect(collector?.status).toBe("warning");
    expect(collector?.statusText).toBe("Starting");
    expect(collector?.error).toBeUndefined();
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

  it("does not warn when dashboard subnet omits trailing dot vs node", () => {
    const steps = buildPiHolePipelineSteps({
      dashboardConfig: { ...baseConfig, clientSubnetPrefix: "10.80.0" },
      serverPiHoleEnabled: true,
      serverApiUrl: "https://xs2.example.com/",
      stack: "xray",
      diagnostics: {
        ...runningDiagnostics,
        clientSubnetPrefix: "10.80.0.",
        baseUrl: baseConfig.baseUrl,
      },
    });

    const runtime = steps.find((s) => s.id === "runtime-push");
    expect(runtime?.status).toBe("ok");
    expect(runtime?.error).toBeUndefined();
  });

  it("warns when dashboard and node subnet prefixes truly differ", () => {
    const steps = buildPiHolePipelineSteps({
      dashboardConfig: { ...baseConfig, clientSubnetPrefix: "10.80.0." },
      serverPiHoleEnabled: true,
      serverApiUrl: "https://xs2.example.com/",
      stack: "xray",
      diagnostics: {
        ...runningDiagnostics,
        clientSubnetPrefix: "10.80.1.",
        baseUrl: baseConfig.baseUrl,
      },
    });

    const runtime = steps.find((s) => s.id === "runtime-push");
    expect(runtime?.status).toBe("warning");
    expect(runtime?.error).toMatch(/differs from node/i);
  });

  it("xray: warns when afterFilter>0 but forwarded=0 (IdentityIp miss)", () => {
    const steps = buildPiHolePipelineSteps({
      dashboardConfig: { ...baseConfig, clientSubnetPrefix: "10.80.0.", baseUrl: "http://172.20.0.1:8080" },
      serverPiHoleEnabled: true,
      serverApiUrl: "https://xs2.example.com/",
      stack: "xray",
      diagnostics: {
        ...runningDiagnostics,
        baseUrl: "http://172.20.0.1:8080",
        clientSubnetPrefix: "10.80.0.",
        lastPollQueriesAfterFilter: 4,
        lastPollQueriesForwarded: 0,
        lastPollQueriesEnriched: 0,
        storedQueryCount: 0,
      },
    });

    const collector = steps.find((s) => s.id === "collector");
    expect(collector?.status).toBe("warning");
    expect(collector?.statusText).toBe("No CN match");
    expect(collector?.error).toMatch(/IdentityIp/i);
    expect(firstPiHolePipelineIssue(steps)?.id).toBe("collector");
  });

    it("xray: warns when last poll forwarded 0 (no Pi-hole DNS from clients)", () => {
    const steps = buildPiHolePipelineSteps({
      dashboardConfig: { ...baseConfig, clientSubnetPrefix: "10.80.0.", baseUrl: "http://172.20.0.1:8080" },
      serverPiHoleEnabled: true,
      serverApiUrl: "https://xs2.example.com/",
      stack: "xray",
      diagnostics: {
        ...runningDiagnostics,
        baseUrl: "http://172.20.0.1:8080",
        clientSubnetPrefix: "10.80.0.",
        lastPollQueriesAfterFilter: 0,
        lastPollQueriesForwarded: 0,
        storedQueryCount: 10,
        lastStoredQueryAtUtc: "2026-08-16T15:50:51Z",
        lastSuccessfulPollAtUtc: "2026-08-16T16:55:13Z",
      },
    });

    const collector = steps.find((s) => s.id === "collector");
    expect(collector?.status).toBe("warning");
    expect(collector?.statusText).toBe("No DNS via Pi-hole");
    expect(collector?.fix).toMatch(/dnsServers JSON/);
    expect(collector?.fix).toMatch(/dns-id-\*/);
    expect(collector?.fix).not.toMatch(/172\.20\.0\.1:53/);
    const storage = steps.find((s) => s.id === "storage");
    expect(storage?.status).toBe("warning");
    expect(storage?.statusText).toBe("Stale history");
  });

  it("marks storage Receiving when forwarded>0 but stored=0", () => {
    const steps = buildPiHolePipelineSteps({
      dashboardConfig: baseConfig,
      serverPiHoleEnabled: true,
      serverApiUrl: "https://s6.datagateapp.com/",
      diagnostics: {
        ...runningDiagnostics,
        storedQueryCount: 0,
        lastStoredQueryAtUtc: undefined,
        lastPollQueriesForwarded: 3,
      },
    });

    const storage = steps.find((s) => s.id === "storage");
    expect(storage?.status).toBe("ok");
    expect(storage?.statusText).toBe("Receiving");
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
