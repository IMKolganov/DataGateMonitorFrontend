import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetApiOpenVpnServersVpnServerIdOpenvpnProcessStatusQueryKey,
  postApiOpenVpnServersVpnServerIdOpenvpnProcessKill,
  postApiOpenVpnServersVpnServerIdOpenvpnProcessRestart,
  postApiOpenVpnServersVpnServerIdOpenvpnProcessStart,
  useGetApiOpenVpnServersVpnServerIdOpenvpnProcessStatus,
} from "../../api/orval/vpn-server-open-vpn-process/vpn-server-open-vpn-process";
import type { DataGateOpenVpnManagerOpenVpnProcessResponsesOpenVpnProcessStatusResponse } from "../../api/orval/model";

type ProcessStatus = DataGateOpenVpnManagerOpenVpnProcessResponsesOpenVpnProcessStatusResponse;

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "Request failed.";
}

interface Props {
  vpnServerId: number;
  disabled?: boolean;
}

/**
 * Admin controls for the OpenVPN daemon on the node (start / restart / kill).
 * Kill and restart disconnect all VPN clients.
 */
export function OpenVpnProcessControls({ vpnServerId, disabled = false }: Props) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"start" | "restart" | "kill" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const statusQuery = useGetApiOpenVpnServersVpnServerIdOpenvpnProcessStatus(vpnServerId, {
    query: {
      enabled: vpnServerId > 0 && !disabled,
      refetchInterval: 10_000,
      retry: 1,
    },
  });

  const status = statusQuery.data as ProcessStatus | undefined;
  const statusError = statusQuery.isError ? errorMessage(statusQuery.error) : null;

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: getGetApiOpenVpnServersVpnServerIdOpenvpnProcessStatusQueryKey(vpnServerId),
    });
  };

  const run = async (action: "start" | "restart" | "kill") => {
    if (busy || disabled) return;

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
      setLastMessage(result.message ?? `${action} completed.`);
      await invalidate();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const running = status?.isRunning === true;
  const blocked = disabled || busy !== null;

  return (
    <section className="openvpn-process-controls" aria-labelledby="openvpn-process-heading">
      <h3 id="openvpn-process-heading" className="settings-card__h3-with-icon">
        OpenVPN process
      </h3>
      <p className="server-details__muted server-details__intro">
        Controls the OpenVPN daemon inside the node container. Restart and kill drop all sessions; the
        manager API keeps running.
      </p>

      <div className="openvpn-process-controls__status">
        <span className="detail-label">Daemon:</span>
        <span>
          {statusQuery.isLoading && !status
            ? "Checking…"
            : statusError
              ? "Unavailable"
              : running
                ? `Running${status?.pid != null ? ` (pid ${status.pid})` : ""}`
                : "Stopped"}
        </span>
        <button
          type="button"
          className="btn secondary"
          disabled={blocked || statusQuery.isFetching}
          onClick={() => void statusQuery.refetch()}
        >
          Refresh
        </button>
      </div>

      {statusError ? (
        <div className="server-details__alert" role="alert">
          {statusError}
        </div>
      ) : null}
      {actionError ? (
        <div className="server-details__alert" role="alert">
          {actionError}
        </div>
      ) : null}
      {lastMessage ? <p className="server-details__muted">{lastMessage}</p> : null}

      <div className="openvpn-process-controls__actions">
        <button
          type="button"
          className="btn primary"
          disabled={blocked || running}
          onClick={() => void run("start")}
        >
          {busy === "start" ? "Starting…" : "Start"}
        </button>
        <button
          type="button"
          className="btn secondary"
          disabled={blocked}
          onClick={() => void run("restart")}
        >
          {busy === "restart" ? "Restarting…" : "Restart"}
        </button>
        <button
          type="button"
          className="btn danger"
          disabled={blocked || (!running && !statusError)}
          onClick={() => void run("kill")}
        >
          {busy === "kill" ? "Stopping…" : "Kill"}
        </button>
      </div>
    </section>
  );
}
