import type { PiHoleDiagnosticsResponse, VpnServerPiHoleConfigDto } from "../../api/orvalModelShim";

export type PiHolePipelineStepStatus = "ok" | "warning" | "error" | "pending" | "skipped";

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
  } = input;

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
        : "Integration is off — nothing is pushed to the OpenVPN microservice.",
      fix,
    });
  }

  // 3 — Runtime push
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
      summary = "Reading OpenVPN microservice runtime…";
    } else if (diagnosticsFetchError) {
      status = "error";
      statusText = "Unreachable";
      error = diagnosticsFetchError;
      summary = `Target: ${apiUrl}/api/pi-hole/config`;
      fix =
        "Verify server Api URL, microservice is running (≥ 1.2.5.67 with Pi-hole API), and backend JWT to the microservice works.";
    } else if (d) {
      if (!d.enabled) {
        status = "error";
        statusText = "Not applied";
        error = "Collector is disabled on the OpenVPN microservice.";
        summary = `Runtime on microservice: disabled, password ${d.hasAppPassword ? "set" : "not set"}.`;
        fix =
          "Click Save & apply (saved to $DATA_DIR/pihole-runtime-config.json), or set PIHOLE_ENABLED=true and related PIHOLE_* env vars (env wins when set).";
      } else if (!d.hasAppPassword) {
        status = "error";
        statusText = "No password";
        error = "Microservice runtime has no Pi-hole app password.";
        fix = "Re-enter the app password and click Save & apply.";
      } else if (cfg?.baseUrl && d.baseUrl && cfg.baseUrl.trim() !== d.baseUrl.trim()) {
        status = "warning";
        statusText = "Mismatch";
        error = `Dashboard Base URL (${cfg.baseUrl}) differs from microservice (${d.baseUrl}).`;
        fix = "Click Save & apply to sync runtime with dashboard.";
      } else if (
        cfg?.clientSubnetPrefix?.trim() &&
        d.clientSubnetPrefix?.trim() &&
        cfg.clientSubnetPrefix.trim() !== d.clientSubnetPrefix.trim()
      ) {
        status = "warning";
        statusText = "Mismatch";
        error = `Dashboard subnet (${cfg.clientSubnetPrefix}) differs from microservice (${d.clientSubnetPrefix || "(all)"}).`;
        fix = "Click Save & apply to sync subnet filter.";
      } else if (!d.runtimeConfigAppliedAtUtc) {
        status = "ok";
        statusText = "From env";
        summary =
          "Collector enabled from container env/appsettings. Set PIHOLE_* env vars to override dashboard config.";
      } else {
        status = "ok";
        statusText = "Applied";
        summary = `Dashboard config saved at ${fmtUtc(d.runtimeConfigAppliedAtUtc)} ($DATA_DIR/pihole-runtime-config.json). PIHOLE_* env vars override these values when set.`;
      }
    } else {
      status = "pending";
      statusText = "Unknown";
      summary = "Refresh status after Save & apply.";
    }

    steps.push({
      id: "runtime-push",
      step: 3,
      title: "Runtime on OpenVPN microservice",
      flow: "Dashboard backend → PUT {ApiUrl}/api/pi-hole/config (JWT)",
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
    } else if (d) {
      const probeError = d.error?.trim();
      if (probeError) {
        status = "error";
        statusText = "Probe failed";
        error = probeError;
        fix = "On the VPN host, test: curl -X POST {BaseUrl}/api/auth with the app password.";
      } else if (!d.authenticated) {
        status = "error";
        statusText = "Auth failed";
        error = "Pi-hole API authentication failed.";
        fix = "Check application password and Pi-hole web/API port (e.g. http://127.0.0.1:8080).";
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
      flow: "OpenVPN container → POST {BaseUrl}/api/auth → GET api/queries",
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
    const pollError = d?.lastPollError?.trim();

    if (upstreamBlocked(steps, 5)) {
      summary = "Fix upstream steps before the collector can run.";
    } else if (d) {
      if (pollError) {
        status = "error";
        statusText = "Poll error";
        error = pollError;
        fix = "Check Pi-hole logs and microservice logs (openvpn-udp-wss).";
      } else if (!d.collectorRunning) {
        status = "warning";
        statusText = "Stopped";
        error = "Background collector is not running on the microservice.";
        fix = "Save & apply again or inspect container logs.";
      } else if (!d.lastSuccessfulPollAtUtc) {
        status = "warning";
        statusText = "Starting";
        summary = "Collector is running; waiting for the first successful poll.";
      } else {
        status = "ok";
        statusText = "Running";
        summary = `Last success ${fmtUtc(d.lastSuccessfulPollAtUtc)}, forwarded ${d.lastPollQueriesForwarded ?? 0} on last poll.`;
      }
    }

    steps.push({
      id: "collector",
      step: 5,
      title: "DNS query collector",
      flow: "Microservice background service → Pi-hole api/queries (subnet filter → enrich → forward)",
      status,
      statusText,
      summary,
      error,
      fix,
    });
  }

  // 6 — Dashboard storage
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
        summary =
          "Steps 1–5 are OK. This step waits for DNS query rows in the dashboard DB (see the table below). " +
          "Stay connected on VPN, browse for a minute, then refresh — up to one poll interval.";
        fix =
          "Normal after setup: collector must forward at least one batch before rows appear here. " +
          "If it stays empty, check step 5 (forwarded count) and subnet prefix.";
      } else if (stored === 0 && forwarded > 0) {
        status = "ok";
        statusText = "Receiving";
        summary =
          `Collector forwarded ${forwarded} on the last poll; waiting for DNS rows in the dashboard DB.`;
      } else {
        status = "ok";
        statusText = "Stored";
        summary = `${stored} DNS queries in dashboard DB (last ${fmtUtc(d.lastStoredQueryAtUtc)}).`;
      }
    }

    steps.push({
      id: "storage",
      step: 6,
      title: "Dashboard storage",
      flow: "Microservice → POST backend /api/vpn-dns-queries → Dashboard DB",
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
