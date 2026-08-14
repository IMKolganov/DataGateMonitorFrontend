import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetApiOpenVpnServersVpnServerIdOpenvpnProcessStatusQueryKey,
  postApiOpenVpnServersVpnServerIdOpenvpnProcessKill,
  postApiOpenVpnServersVpnServerIdOpenvpnProcessRestart,
  postApiOpenVpnServersVpnServerIdOpenvpnProcessStart,
  useGetApiOpenVpnServersVpnServerIdOpenvpnProcessStatus,
} from "../../api/orval/vpn-server-open-vpn-process/vpn-server-open-vpn-process";
import type { DataGateOpenVpnManagerOpenVpnProcessResponsesOpenVpnProcessStatusResponse } from "../../api/orval/model";
import { errorMessage } from "../../utils/errorMessage";

type ProcessStatus = DataGateOpenVpnManagerOpenVpnProcessResponsesOpenVpnProcessStatusResponse;
type Action = "start" | "restart" | "kill";

interface Props {
  vpnServerId: number;
  disabled?: boolean;
}

function formatPhase(status: ProcessStatus | undefined): string {
  const phase = (status?.phase ?? "").toLowerCase();
  switch (phase) {
    case "starting":
      return "Starting…";
    case "stopping":
      return "Stopping…";
    case "restarting":
      return "Restarting…";
    case "failed":
      return "Failed";
    case "running":
      return status?.pid != null ? `Running (pid ${status.pid})` : "Running";
    case "stopped":
      return "Stopped";
    default:
      if (status?.isRunning) {
        return status.pid != null ? `Running (pid ${status.pid})` : "Running";
      }
      return status ? "Stopped" : "Checking…";
  }
}

/**
 * Admin controls for the OpenVPN daemon on the node (start / restart / kill).
 * Kill and restart disconnect all VPN clients.
 * Status is polled from that VPN server's manager (each node is independent).
 */
export function OpenVpnProcessControls({ vpnServerId, disabled = false }: Props) {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState<Action | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const statusQuery = useGetApiOpenVpnServersVpnServerIdOpenvpnProcessStatus(vpnServerId, {
    query: {
      enabled: vpnServerId > 0 && !disabled,
      refetchInterval: (q) => {
        const data = q.state.data as ProcessStatus | undefined;
        if (busy || data?.operationInProgress) return 1_500;
        return 10_000;
      },
      retry: 1,
    },
  });

  const status = statusQuery.data as ProcessStatus | undefined;
  const statusError = statusQuery.isError ? errorMessage(statusQuery.error) : null;
  const nodeBusy = status?.operationInProgress === true;
  const remoteProgress =
    nodeBusy || (status?.phase != null && /^(starting|stopping|restarting)$/i.test(status.phase));

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: getGetApiOpenVpnServersVpnServerIdOpenvpnProcessStatusQueryKey(vpnServerId),
    });
  };

  const run = async (action: Action) => {
    if (disabled) return;
    if (inFlight.current || busy !== null || nodeBusy) {
      setActionError(
        status?.message?.trim() ||
          "Please wait — an OpenVPN operation is already running on this node.",
      );
      return;
    }

    if (action === "restart") {
      const ok = window.confirm(
        "Restart OpenVPN on this node? All connected VPN clients will be disconnected.",
      );
      if (!ok) return;
    }
    if (action === "kill") {
      const ok = window.confirm(
        "Stop (kill) OpenVPN on this node? All connected VPN clients will be disconnected. The manager API stays up.",
      );
      if (!ok) return;
    }

    inFlight.current = true;
    setBusy(action);
    setActionError(null);
    setLastMessage(null);

    try {
      const fn =
        action === "start"
          ? postApiOpenVpnServersVpnServerIdOpenvpnProcessStart
          : action === "restart"
            ? postApiOpenVpnServersVpnServerIdOpenvpnProcessRestart
            : postApiOpenVpnServersVpnServerIdOpenvpnProcessKill;
      const result = (await fn(vpnServerId)) as ProcessStatus;
      const okText = result.message?.trim() || `OpenVPN ${action} completed successfully.`;
      setLastMessage(okText);
      await invalidate();
    } catch (err) {
      setActionError(errorMessage(err) || `OpenVPN ${action} failed.`);
      setLastMessage(null);
      await invalidate();
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const running = status?.isRunning === true;
  const blocked = disabled || busy !== null || inFlight.current || nodeBusy;

  return (
    <section className="openvpn-process-controls" aria-labelledby="openvpn-process-heading">
      <h3 id="openvpn-process-heading" className="settings-card__h3-with-icon">
        OpenVPN process
      </h3>
      <p className="server-details__muted server-details__intro">
        Controls the OpenVPN daemon inside this node&apos;s container. Status is read live from that
        server (other VPN nodes are independent). Restart and kill drop all sessions; the manager API
        keeps running.
      </p>

      <div className="openvpn-process-controls__status">
        <span className="detail-label">Daemon:</span>
        <span className="notranslate" translate="no">
          {statusQuery.isLoading && !status
            ? "Checking…"
            : statusError
              ? "Unavailable"
              : formatPhase(status)}
        </span>
        {status?.currentOperation ? (
          <span className="openvpn-process-controls__op notranslate" translate="no">
            op: {status.currentOperation}
          </span>
        ) : null}
        <button
          type="button"
          className="btn secondary"
          disabled={blocked || statusQuery.isFetching}
          onClick={() => void statusQuery.refetch()}
        >
          Refresh
        </button>
      </div>

      <div className="openvpn-process-controls__messages">
        {statusError ? (
          <div className="server-details__alert" role="alert">
            {statusError}
          </div>
        ) : null}
        {remoteProgress && status?.message ? (
          <div
            className="server-details__alert openvpn-process-controls__progress notranslate"
            role="status"
            translate="no"
          >
            {status.message}
          </div>
        ) : null}
        {status?.lastError && !remoteProgress ? (
          <div className="server-details__alert notranslate" role="alert" translate="no">
            Last error: {status.lastError}
          </div>
        ) : null}
        {actionError ? (
          <div className="server-details__alert" role="alert">
            {actionError}
          </div>
        ) : null}
        {lastMessage ? (
          <p className="openvpn-process-controls__success notranslate" role="status" translate="no">
            {lastMessage}
          </p>
        ) : null}
      </div>

      <div className="openvpn-process-controls__actions">
        <button
          type="button"
          className="btn primary"
          disabled={blocked || running}
          aria-busy={busy === "start" || status?.phase === "starting"}
          onClick={() => void run("start")}
        >
          {busy === "start" || status?.phase === "starting" ? "Starting…" : "Start"}
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={blocked}
          aria-busy={busy === "restart" || status?.currentOperation === "restart"}
          onClick={() => void run("restart")}
        >
          {busy === "restart" || status?.currentOperation === "restart"
            ? "Restarting…"
            : "Restart"}
        </button>
        <button
          type="button"
          className="btn danger"
          disabled={blocked || (!running && !statusError && !nodeBusy)}
          aria-busy={busy === "kill" || status?.currentOperation === "kill"}
          onClick={() => void run("kill")}
        >
          {busy === "kill" || status?.currentOperation === "kill" ? "Stopping…" : "Kill"}
        </button>
      </div>
    </section>
  );
}
