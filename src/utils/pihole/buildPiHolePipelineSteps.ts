import type { PiHoleDiagnosticsResponse, VpnServerPiHoleConfigDto } from "../../api/orvalModelShim";
import { piHoleClientSubnetPrefixesEqual } from "./normalizePiHoleClientSubnetPrefix";

export type PiHolePipelineStepStatus = "ok" | "warning" | "error" | "pending" | "skipped";

export type PiHolePipelineStack = "openvpn" | "xray";

export type PiHolePipelineStep = {
  id: string;
  step: number;
  title: string;
  flow: string;
  status: PiHolePipelineStepStatus;
  statusText: string;
  summary?: string;
  error?: string;
  fix?: string;
};

export type PiHolePipelineInput = {
  dashboardConfig?: VpnServerPiHoleConfigDto | null;
  serverPiHoleEnabled: boolean;
  serverApiUrl?: string | null;
  diagnostics?: PiHoleDiagnosticsResponse | null;
  diagnosticsFetchError?: string | null;
  diagnosticsLoading?: boolean;
  /** Both stacks push runtime to the VPN node collector (OpenVPN or Xray manager). */
  stack?: PiHolePipelineStack;
};

function fmtUtc(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function configSaved(cfg?: VpnServerPiHoleConfigDto | null): boolean {
  return Boolean(cfg?.baseUrl?.trim());
}

function configComplete(cfg?: VpnServerPiHoleConfigDto | null): boolean {
  return Boolean(cfg?.baseUrl?.trim() && cfg?.hasAppPassword);
}

function upstreamBlocked(steps: PiHolePipelineStep[], beforeStep: number): boolean {
  return steps.some((s) => s.step < beforeStep && (s.status === "error" || s.status === "pending"));
}

export function buildPiHolePipelineSteps(input: PiHolePipelineInput): PiHolePipelineStep[] {
  const {
    dashboardConfig: cfg,
    serverPiHoleEnabled,
    serverApiUrl,
    diagnostics: d,
    diagnosticsFetchError,
    diagnosticsLoading,
    stack = "openvpn",
  } = input;

  const isXray = stack === "xray";
  const steps: PiHolePipelineStep[] = [];
  const apiUrl = serverApiUrl?.trim() || "—";
  const subnet = cfg?.clientSubnetPrefix?.trim() || "(all VPN clients)";

  // 1 — Dashboard DB
  {
    let status: PiHolePipelineStepStatus = "pending";
    let statusText = "Not saved";
    let error: string | undefined;
    let fix: string | undefined = "Fill connection settings below and click Save settings.";
    let summary: string | undefined;

    if (configComplete(cfg)) {
      status = "ok";
      statusText = "Saved";
      summary = `Stored in dashboard DB: ${cfg!.baseUrl?.trim()}, password set, subnet ${subnet}, poll ${cfg!.pollIntervalSeconds ?? 60}s.`;
      fix = undefined;
    } else if (configSaved(cfg)) {
      status = "warning";
      statusText = "Incomplete";
      error = "Base URL is saved but application password is missing.";
      fix = "Enter the Pi-hole app password and click Save settings.";
    }

    steps.push({
      id: "dashboard-config",
      step: 1,
      title: "Dashboard configuration",
      flow: "Admin UI → Dashboard DB (VpnServerPiHoleConfig)",
      status,
      statusText,
      summary,
      error,
      fix,
    });
  }

  // 2 — Integration flag
  {
    let status: PiHolePipelineStepStatus = serverPiHoleEnabled ? "ok" : "pending";
    let statusText = serverPiHoleEnabled ? "Enabled" : "Off";
    let fix = serverPiHoleEnabled
      ? undefined
      : "Check Enable Pi-hole integration below and click Save & apply.";

    steps.push({
      id: "integration-flag",
      step: 2,
      title: "Integration enabled",
      flow: "Dashboard → VpnServer.IsPiHoleEnabled",
      status,
      statusText,
      summary: serverPiHoleEnabled
        ? undefined
        : isXray
          ? "Integration is off — nothing is pushed to the Xray node collector."
          : "Integration is off — nothing is pushed to the OpenVPN microservice.",
      fix,
    });
  }

  // 3 — Runtime push (OpenVPN and Xray both apply to the VPN node)
  {
    let status: PiHolePipelineStepStatus = "skipped";
    let statusText = "Skipped";
    let error: string | undefined;
    let fix: string | undefined;
    let summary: string | undefined;

    if (!serverPiHoleEnabled) {
      summary = "Enable integration (step 2) first.";
    } else if (diagnosticsLoading && !d) {
      status = "pending";
      statusText = "Checking…";
      summary = isXray
        ? "Reading Xray node Pi-hole runtime…"
        : "Reading OpenVPN microservice runtime…";
    } else if (diagnosticsFetchError) {
      status = "error";
      statusText = "Unreachable";
      error = diagnosticsFetchError;
      summary = `Target: ${apiUrl}/api/pi-hole/config`;
      fix = isXray
        ? "Verify server Api URL, Xray manager is running with Pi-hole API, and backend JWT to the node works."
        : "Verify server Api URL, microservice is running (≥ 1.2.5.67 with Pi-hole API), and backend JWT to the microservice works.";
    } else if (d) {
      if (!d.enabled) {
        status = "error";
        statusText = "Not applied";
        error = isXray
          ? "Collector is disabled on the Xray node."
          : "Collector is disabled on the OpenVPN microservice.";
        summary = `Runtime on node: disabled, password ${d.hasAppPassword ? "set" : "not set"}.`;
        fix = "Click Save & apply, or set PIHOLE_ENABLED=true and related PIHOLE_* env vars (env wins when set).";
      } else if (!d.hasAppPassword) {
        status = "error";
        statusText = "No password";
        error = "Node runtime has no Pi-hole app password.";
        fix = "Re-enter the app password and click Save & apply.";
      } else if (cfg?.baseUrl && d.baseUrl && cfg.baseUrl.trim() !== d.baseUrl.trim()) {
        status = "warning";
        statusText = "Mismatch";
        error = `Dashboard Base URL (${cfg.baseUrl}) differs from node (${d.baseUrl}).`;
        fix = "Click Save & apply to sync runtime with dashboard.";
      } else if (
        cfg?.clientSubnetPrefix?.trim() &&
        d.clientSubnetPrefix?.trim() &&
        !piHoleClientSubnetPrefixesEqual(cfg.clientSubnetPrefix, d.clientSubnetPrefix)
      ) {
        status = "warning";
        statusText = "Mismatch";
        error = `Dashboard subnet (${cfg.clientSubnetPrefix}) differs from node (${d.clientSubnetPrefix || "(all)"}).`;
        fix = "Use the identity pool form with a trailing dot (e.g. 10.80.0.) and click Save & apply.";
      } else if (!d.runtimeConfigAppliedAtUtc) {
        status = "ok";
        statusText = "From env";
        summary =
          "Collector enabled from container env/appsettings. Set PIHOLE_* env vars to override dashboard config.";
      } else {
        status = "ok";
        statusText = "Applied";
        summary = isXray
          ? `Dashboard config applied at ${fmtUtc(d.runtimeConfigAppliedAtUtc)}. CN comes from IdentityIp (XRAY_DNS_IDENTITY_*) when client DNS goes through Pi-hole.`
          : `Dashboard config saved at ${fmtUtc(d.runtimeConfigAppliedAtUtc)} ($DATA_DIR/pihole-runtime-config.json). PIHOLE_* env vars override these values when set.`;
      }
    } else {
      status = "pending";
      statusText = "Unknown";
      summary = "Refresh status after Save & apply.";
    }

    steps.push({
      id: "runtime-push",
      step: 3,
      title: isXray ? "Runtime on Xray node" : "Runtime on OpenVPN microservice",
      flow: isXray
        ? "Dashboard backend → PUT {ApiUrl}/api/pi-hole/config (JWT → DataGateXRayManager)"
        : "Dashboard backend → PUT {ApiUrl}/api/pi-hole/config (JWT)",
      status,
      statusText,
      summary,
      error,
      fix,
    });
  }

  // 4 — Pi-hole API
  {
    let status: PiHolePipelineStepStatus = "skipped";
    let statusText = "Skipped";
    let error: string | undefined;
    let fix: string | undefined;
    let summary: string | undefined;

    if (upstreamBlocked(steps, 4)) {
      summary = "Complete steps 1–3 first.";
    } else if (diagnosticsLoading && !d) {
      status = "pending";
      statusText = "Checking…";
      summary = isXray
        ? "Probing Pi-hole API from the Xray node…"
        : "Probing Pi-hole API from the OpenVPN microservice…";
    } else if (diagnosticsFetchError) {
      status = "error";
      statusText = "Unreachable";
      error = diagnosticsFetchError;
      fix = isXray
        ? "Check Pi-hole Base URL / password and that the Xray container can reach Pi-hole (not dashboard localhost)."
        : "Check Pi-hole Base URL / password and that the OpenVPN host can reach Pi-hole.";
    } else if (d) {
      const probeError = d.error?.trim();
      if (probeError) {
        status = "error";
        statusText = "Probe failed";
        error = probeError;
        fix = "Test: curl -X POST {BaseUrl}/api/auth with the app password (from the host that runs the collector).";
      } else if (!d.authenticated) {
        status = "error";
        statusText = "Auth failed";
        error = "Pi-hole API authentication failed.";
        fix = isXray
          ? "Check application password and Base URL from the Xray container (e.g. http://172.17.0.1:8080 when Pi-hole is in the OpenVPN netns)."
          : "Check application password and Pi-hole web/API port (e.g. http://127.0.0.1:8080).";
      } else {
        status = "ok";
        statusText = "Reachable";
        summary = `${d.baseUrl} — authenticated, ${d.sampleQueryCount ?? 0} sample queries in probe.`;
      }
    }

    steps.push({
      id: "pihole-api",
      step: 4,
      title: "Pi-hole API",
      flow: isXray
        ? "Xray node → POST {BaseUrl}/api/auth → GET api/queries"
        : "OpenVPN container → POST {BaseUrl}/api/auth → GET api/queries",
      status,
      statusText,
      summary,
      error,
      fix,
    });
  }

  // 5 — Collector
  {
    let status: PiHolePipelineStepStatus = "skipped";
    let statusText = "Skipped";
    let error: string | undefined;
    let fix: string | undefined;
    let summary: string | undefined;
    // Ignore poll errors recorded before the last Save & apply (stale BaseUrl, etc.).
    const pollError = (() => {
      const raw = d?.lastPollError?.trim();
      if (!raw) return undefined;
      const applied = d?.runtimeConfigAppliedAtUtc ? Date.parse(d.runtimeConfigAppliedAtUtc) : NaN;
      const lastPoll = d?.lastPollAtUtc ? Date.parse(d.lastPollAtUtc) : NaN;
      if (Number.isFinite(applied) && Number.isFinite(lastPoll) && lastPoll < applied) return undefined;
      return raw;
    })();

    if (upstreamBlocked(steps, 5)) {
      summary = "Fix upstream steps before the collector can run.";
    } else if (d) {
      if (pollError) {
        status = "error";
        statusText = "Poll error";
        error = pollError;
        fix = isXray
          ? "Check Xray manager logs (PiHoleQueryCollector) and Pi-hole reachability from that container."
          : "Check Pi-hole logs and microservice logs (openvpn-udp-wss).";
      } else if (!d.collectorRunning) {
        status = "warning";
        statusText = "Stopped";
        error = isXray
          ? "Background collector is not running on the Xray node."
          : "Background collector is not running on the microservice.";
        fix = "Save & apply again or inspect container / backend logs.";
      } else if (!d.lastSuccessfulPollAtUtc && (d.storedQueryCount ?? 0) === 0) {
        status = "warning";
        statusText = "Starting";
        summary = isXray
          ? "Collector is running; waiting for the first successful poll (clients must use Pi-hole DNS)."
          : "Collector is running; waiting for the first successful poll.";
      } else {
        status = "ok";
        statusText = "Running";
        summary = isXray
          ? `Last success ${fmtUtc(d.lastSuccessfulPollAtUtc)}, forwarded ${d.lastPollQueriesForwarded ?? 0} on last poll (CN via IdentityIp).`
          : `Last success ${fmtUtc(d.lastSuccessfulPollAtUtc)}, forwarded ${d.lastPollQueriesForwarded ?? 0} on last poll.`;
      }
    }

    steps.push({
      id: "collector",
      step: 5,
      title: "DNS query collector",
      flow: isXray
        ? "Xray node → Pi-hole api/queries → SignalR DnsQueriesReceived → dashboard"
        : "Microservice background service → Pi-hole api/queries (subnet filter → enrich → forward)",
      status,
      statusText,
      summary,
      error,
      fix,
    });
  }

  // 6 — Dashboard storage (+ query log table)
  {
    let status: PiHolePipelineStepStatus = "skipped";
    let statusText = "Skipped";
    let error: string | undefined;
    let fix: string | undefined;
    let summary: string | undefined;

    if (upstreamBlocked(steps, 6)) {
      summary = "Queries are stored only after upstream steps succeed.";
    } else if (d) {
      const stored = d.storedQueryCount ?? 0;
      const forwarded = d.lastPollQueriesForwarded ?? 0;
      if (stored === 0 && forwarded === 0) {
        status = "ok";
        statusText = "Waiting for DNS records";
        summary = isXray
          ? "Steps 1–5 are OK. Enable XRAY_DNS_IDENTITY_*, set DNS1 to Pi-hole, client VPN DNS through the tunnel, browse a minute, then refresh. Rows match via IdentityIp → CN."
          : "Steps 1–5 are OK. This step waits for DNS query rows in the dashboard DB (see the table below). " +
            "Stay connected on VPN, browse for a minute, then refresh — up to one poll interval.";
        fix = "If it stays empty, check subnet prefix and that clients resolve DNS through Pi-hole.";
      } else if (stored === 0 && forwarded > 0) {
        status = "ok";
        statusText = "Receiving";
        summary = `Collector forwarded ${forwarded} on the last poll; waiting for DNS rows in the dashboard DB.`;
      } else {
        status = "ok";
        statusText = "Stored";
        summary = `${stored} DNS queries in dashboard DB (last ${fmtUtc(d.lastStoredQueryAtUtc)}). See Recent DNS queries below.`;
      }
    }

    steps.push({
      id: "storage",
      step: 6,
      title: "Dashboard storage & query log",
      flow: isXray
        ? "Xray SignalR DnsQueriesReceived → VpnDnsQueryLog (grid below)"
        : "OpenVPN SignalR DnsQueriesReceived → VpnDnsQueryLog (grid below)",
      status,
      statusText,
      summary,
      error,
      fix,
    });
  }

  return steps;
}

export function firstPiHolePipelineIssue(steps: PiHolePipelineStep[]): PiHolePipelineStep | undefined {
  return (
    steps.find((s) => s.status === "error") ??
    steps.find((s) => s.status === "pending") ??
    steps.find((s) => s.status === "warning")
  );
}

/** Single-line value for detail-row display (label comes from step title). */
export function formatPiHoleStepValue(step: PiHolePipelineStep): string {
  if (step.error) return step.error;
  if (step.summary) return step.summary;
  if (step.status === "skipped") return "—";
  return step.statusText;
}

export function piHolePipelineOverallLabel(steps: PiHolePipelineStep[]): { text: string; healthy: boolean } {
  const issue = firstPiHolePipelineIssue(steps);
  if (!issue) return { text: "OK", healthy: true };
  if (issue.status === "error") return { text: `Issue at step ${issue.step}`, healthy: false };
  if (issue.status === "pending") return { text: `Pending step ${issue.step}`, healthy: false };
  return { text: `Warning at step ${issue.step}`, healthy: false };
}
