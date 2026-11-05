import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaTimes, FaEye } from "react-icons/fa";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { vpnServerTypeLabel } from "../constants/vpnServerType";
import { errorMessage } from "../utils/errorMessage";
import {
  unwrapDiscoveryActionResult,
  unwrapPendingDiscoveries,
} from "../utils/servers/pendingServerDiscovery";
import {
  getGetApiOpenVpnServersDiscoveriesPendingQueryKey,
  useGetApiOpenVpnServersDiscoveriesPending,
  usePostApiOpenVpnServersDiscoveriesDiscoveryIdApprove,
  usePostApiOpenVpnServersDiscoveriesDiscoveryIdDeny,
} from "../api/orval/vpn-servers/vpn-servers";
import { getGetApiV3OpenVpnServersGetAllWithStatusQueryKey } from "../api/orval/vpn-servers-v3/vpn-servers-v3";
import type { VpnServersDtoVpnServerDiscoveryDto } from "../api/orval/model/vpnServersDtoVpnServerDiscoveryDto";
import "../css/ServerForm.css";
import "../css/Settings.css";

function formatWhen(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

/**
 * Admin inbox of pending VPN self-announce discoveries.
 */
export default function PendingServerDiscoveriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const pendingQuery = useGetApiOpenVpnServersDiscoveriesPending({
    query: {
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    },
  });

  const discoveries = useMemo(
    () => unwrapPendingDiscoveries(pendingQuery.data),
    [pendingQuery.data],
  );
  const approveMutation = usePostApiOpenVpnServersDiscoveriesDiscoveryIdApprove();
  const denyMutation = usePostApiOpenVpnServersDiscoveriesDiscoveryIdDeny();

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: getGetApiOpenVpnServersDiscoveriesPendingQueryKey(),
    });
    await queryClient.invalidateQueries({
      queryKey: getGetApiV3OpenVpnServersGetAllWithStatusQueryKey(undefined),
    });
  };

  const quickApprove = async (item: VpnServersDtoVpnServerDiscoveryDto) => {
    if (!item.id) return;
    try {
      const raw = await approveMutation.mutateAsync({
        discoveryId: item.id,
        data: {
          serverName: item.suggestedName ?? undefined,
          isEnableWss: true,
        },
      });
      const result = unwrapDiscoveryActionResult(raw);
      toast.success("Server added successfully!");
      await invalidate();
      const vpnServerId = result?.vpnServerId;
      if (vpnServerId != null && vpnServerId > 0) {
        navigate(`/servers/edit/${vpnServerId}`);
      }
    } catch (err) {
      toast.error(errorMessage(err) || "Failed to approve discovery");
    }
  };

  const reject = async (item: VpnServersDtoVpnServerDiscoveryDto) => {
    if (!item.id) return;
    if (!window.confirm(`Reject discovery for ${item.apiUrl || "this server"}?`)) return;
    try {
      await denyMutation.mutateAsync({ discoveryId: item.id, data: {} });
      toast.info("Discovery rejected");
      await invalidate();
    } catch (err) {
      toast.error(errorMessage(err) || "Failed to reject discovery");
    }
  };

  const busy = approveMutation.isPending || denyMutation.isPending;

  return (
    <div className="content-wrapper wide-table">
      <div className="pending-discoveries">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => navigate("/servers")}
            title="Back to servers"
          >
            <span className="icon">{FaArrowLeft({ className: "icon" })}</span>
            Servers
          </button>
          <h2 className="server-form-header" style={{ margin: 0, flex: 1, textAlign: "left" }}>
            Pending server requests
          </h2>
        </div>
        <p className="settings-item-description" style={{ marginBottom: 16 }}>
          VPN nodes that announced themselves and wait for approve or reject. Nothing is lost if you
          close the popup — they stay here until you decide.
        </p>

        {pendingQuery.isLoading ? (
          <p className="settings-item-description">Loading…</p>
        ) : pendingQuery.isError ? (
          <p className="error-message">{errorMessage(pendingQuery.error) || "Failed to load"}</p>
        ) : discoveries.length === 0 ? (
          <p className="settings-item-description">No pending discovery requests.</p>
        ) : (
          <div className="pending-discoveries__scroll">
            <table className="settings-table pending-discoveries__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>API URL</th>
                  <th>Public IP</th>
                  <th>Last seen</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {discoveries.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.suggestedName || "—"}
                      {item.version ? (
                        <div className="settings-item-description" style={{ margin: 0 }}>
                          v{item.version}
                        </div>
                      ) : null}
                    </td>
                    <td>{vpnServerTypeLabel(item.serverType)}</td>
                    <td className="pending-discoveries__url">{item.apiUrl || "—"}</td>
                    <td>{item.publicIp || "—"}</td>
                    <td>{formatWhen(item.lastSeenUtc)}</td>
                    <td className="pending-discoveries__actions-cell">
                      <div className="pending-discoveries__actions">
                        <Link
                          to={`/servers/pending-discoveries/${item.id}`}
                          className="btn secondary"
                          style={{ textDecoration: "none" }}
                        >
                          <span className="icon">{FaEye({ className: "icon" })}</span>
                          Review
                        </Link>
                        <button
                          type="button"
                          className="btn primary"
                          disabled={busy}
                          onClick={() => void quickApprove(item)}
                        >
                          <span className="icon">{FaCheck({ className: "icon" })}</span>
                          Add
                        </button>
                        <button
                          type="button"
                          className="btn secondary"
                          disabled={busy}
                          onClick={() => void reject(item)}
                        >
                          <span className="icon">{FaTimes({ className: "icon" })}</span>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
