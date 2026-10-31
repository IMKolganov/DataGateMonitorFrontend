import type { PiHoleDiagnosticsResponse, VpnServerPiHoleConfigDto } from "../../api/orvalModelShim";
import type { PiHolePipelineStack } from "./buildPiHolePipelineSteps";

export type PiHoleCause = {
  message: string;
  fix: string;
};

export type PiHoleCauseInput = {
  dashboardConfig?: VpnServerPiHoleConfigDto | null;
  serverPiHoleEnabled: boolean;
  diagnostics?: PiHoleDiagnosticsResponse | null;
  diagnosticsFetchError?: string | null;
  stack?: PiHolePipelineStack;
};

const ENTER_MANUALLY = "Enter the connection settings below and click Save & apply";

function rerenderCommands(stack: PiHolePipelineStack): string {
  const stackDir = stack === "xray" ? "~/datagate-monitor-xray" : "~/openvpn-tcp-wss or ~/openvpn-udp-wss";
  return (
    "sudo ./scripts/install-vpn-host.sh --render-only from an installer with PIHOLE_BOOTSTRAP_* support, " +
    `then docker compose up -d --force-recreate in ${stackDir} (this drops active VPN sessions)`
  );
}

/** Compares the dashboard row with the node's own view to explain why Pi-hole is not working. */
export function diagnosePiHoleCause(input: PiHoleCauseInput): PiHoleCause | null {
  const { dashboardConfig: cfg, serverPiHoleEnabled, diagnostics: d, diagnosticsFetchError, stack = "openvpn" } = input;

  if (!d) {
    if (!diagnosticsFetchError) return null;
    return {
      message: "The dashboard could not read diagnostics from the node, so the cause cannot be determined.",
      fix: "Check the server's API URL and that the manager is running.",
    };
  }

  const dashboardComplete = Boolean(cfg?.baseUrl?.trim() && cfg?.hasAppPassword);

  if (!dashboardComplete) {
    if (!d.hasAppPassword) {
      return {
        message:
          "The node has no Pi-hole credentials, so it had nothing to announce and the dashboard had nothing to import. " +
          "Its stack was most likely rendered without PIHOLE_BOOTSTRAP_* variables.",
        fix: `${ENTER_MANUALLY}, or run on the host: ${rerenderCommands(stack)}.`,
      };
    }
    if (d.announceState === "OmittedInsecureBackend") {
      return {
        message: "The node has Pi-hole credentials but left them out of its announce because its backend URL is not HTTPS.",
        fix: `${ENTER_MANUALLY}, or set BACKEND__BASEURL on the node to an HTTPS URL.`,
      };
    }
    if (d.announceState === "BackendNotConfigured") {
      return {
        message: "The node has Pi-hole credentials but no valid backend URL, so it never announces them.",
        fix: `${ENTER_MANUALLY}, or set BACKEND__BASEURL on the node.`,
      };
    }
    return {
      message:
        "The node has Pi-hole credentials, but they never reached the dashboard. " +
        "Announcements are imported only when a discovery is approved; they are ignored once a server is registered.",
      fix: `${ENTER_MANUALLY}.`,
    };
  }

  if (d.credentialSource === "Env" && (!d.enabled || !d.authenticated)) {
    return {
      message: "PIHOLE_* environment variables on the node override the dashboard, so Save & apply cannot change them.",
      fix: "Correct or remove the PIHOLE_* variables in the node's stack and recreate its container.",
    };
  }

  if (serverPiHoleEnabled && (!d.enabled || !d.hasAppPassword)) {
    return {
      message: "The settings are saved in the dashboard but were not applied to the node.",
      fix: "Click Save & apply.",
    };
  }

  return null;
}
