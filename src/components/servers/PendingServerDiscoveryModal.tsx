import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { vpnServerTypeLabel } from "../../constants/vpnServerType";
import { errorMessage } from "../../utils/errorMessage";
import {
  isPendingDiscoveryModalSnoozed,
  pendingDiscoveriesFingerprint,
  readPendingDiscoverySnoozeFingerprint,
  unwrapDiscoveryActionResult,
  unwrapPendingDiscoveries,
  writePendingDiscoverySnoozeFingerprint,
} from "../../utils/servers/pendingServerDiscovery";
import {
  getGetApiOpenVpnServersDiscoveriesPendingQueryKey,
  getGetApiOpenVpnServersGetServerWithStatusVpnServerIdQueryKey,
  getGetApiOpenVpnServersGetVpnServerIdQueryKey,
  useGetApiOpenVpnServersDiscoveriesPending,
  usePostApiOpenVpnServersDiscoveriesDiscoveryIdApprove,
} from "../../api/orval/vpn-servers/vpn-servers";
import { getGetApiV3OpenVpnServersGetAllWithStatusQueryKey } from "../../api/orval/vpn-servers-v3/vpn-servers-v3";
import { getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey } from "../../api/orval/quota-plan-allowed-server/quota-plan-allowed-server";
import {
  OPEN_PENDING_SERVER_DISCOVERY_EVENT,
  type OpenPendingServerDiscoveryDetail,
} from "./pendingServerDiscoveryEvents";
import "../../css/Settings.css";

const POLL_MS = 30_000;

/**
 * Admin-only modal: polls pending VPN discoveries and prompts to Add / Review / Later.
 * Later only snoozes the UI for the current pending set — it does not deny.
 */
export function PendingServerDiscoveryModal() {
  const user = getCurrentUser();
  const admin = isAdmin(user);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const onPendingInbox = location.pathname.startsWith("/servers/pending-discoveries");
  const [preferredDiscoveryId, setPreferredDiscoveryId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [snoozeFingerprint, setSnoozeFingerprint] = useState<string | null>(
    readPendingDiscoverySnoozeFingerprint,
  );
  const [forceShow, setForceShow] = useState(false);

  const pendingQuery = useGetApiOpenVpnServersDiscoveriesPending({
    query: {
      enabled: admin,
      refetchInterval: admin ? POLL_MS : false,
      refetchOnWindowFocus: admin,
    },
  });
  const refetchPending = pendingQuery.refetch;

  useEffect(() => {
    if (!admin) return;
    const onOpen = (ev: Event) => {
      const detail = (ev as CustomEvent<OpenPendingServerDiscoveryDetail>).detail;
      if (detail?.discoveryId != null && Number.isFinite(detail.discoveryId)) {
        setPreferredDiscoveryId(detail.discoveryId);
      }
      setForceShow(true);
      void refetchPending();
    };
    window.addEventListener(OPEN_PENDING_SERVER_DISCOVERY_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PENDING_SERVER_DISCOVERY_EVENT, onOpen);
  }, [admin, refetchPending]);

  const discoveries = useMemo(
    () => unwrapPendingDiscoveries(pendingQuery.data),
    [pendingQuery.data],
  );
  const currentFingerprint = useMemo(
    () => pendingDiscoveriesFingerprint(discoveries.map((d) => d.id)),
    [discoveries],
  );

  const current = useMemo(() => {
    if (discoveries.length === 0) return null;
    if (preferredDiscoveryId != null) {
      const preferred = discoveries.find((d) => d.id === preferredDiscoveryId);
      if (preferred) return preferred;
    }
    return discoveries[0] ?? null;
  }, [discoveries, preferredDiscoveryId]);

  const snoozed = isPendingDiscoveryModalSnoozed({
    forceShow,
    snoozeFingerprint,
    currentFingerprint,
  });

  const approveMutation = usePostApiOpenVpnServersDiscoveriesDiscoveryIdApprove();

  const invalidateServerLists = async (vpnServerId?: number | null) => {
    await queryClient.invalidateQueries({
      queryKey: getGetApiOpenVpnServersDiscoveriesPendingQueryKey(),
    });
    await queryClient.invalidateQueries({
      queryKey: getGetApiV3OpenVpnServersGetAllWithStatusQueryKey(undefined),
    });
    if (vpnServerId != null && vpnServerId > 0) {
      await queryClient.invalidateQueries({
        queryKey: getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey(vpnServerId),
      });
      await queryClient.invalidateQueries({
        queryKey: getGetApiOpenVpnServersGetVpnServerIdQueryKey(vpnServerId),
      });
      await queryClient.invalidateQueries({
        queryKey: getGetApiOpenVpnServersGetServerWithStatusVpnServerIdQueryKey(vpnServerId),
      });
    }
  };

  const handleAdd = async () => {
    if (!current?.id || busy) return;
    setBusy(true);
    try {
      const raw = await approveMutation.mutateAsync({
        discoveryId: current.id,
        data: {
          isEnableWss: current.isEnableWss ?? false,
          serverName: current.suggestedName ?? undefined,
        },
      });
      const result = unwrapDiscoveryActionResult(raw);
      const vpnServerId = result?.vpnServerId ?? null;
      toast.success("Server added successfully!");
      setPreferredDiscoveryId(null);
      setForceShow(false);
      await invalidateServerLists(vpnServerId);
      if (vpnServerId != null && vpnServerId > 0) {
        navigate(`/servers/edit/${vpnServerId}`);
      }
    } catch (err) {
      toast.error(errorMessage(err) || "Failed to add discovered server");
    } finally {
      setBusy(false);
    }
  };

  const handleLater = () => {
    writePendingDiscoverySnoozeFingerprint(currentFingerprint);
    setSnoozeFingerprint(currentFingerprint);
    setForceShow(false);
    setPreferredDiscoveryId(null);
  };

  const handleReview = () => {
    if (!current?.id) return;
    setForceShow(false);
    navigate(`/servers/pending-discoveries/${current.id}`);
  };

  const handleOpenAll = () => {
    setForceShow(false);
    navigate("/servers/pending-discoveries");
  };

  if (!admin || !current || snoozed || onPendingInbox) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pending-discovery-title">
      <div className="modal-content" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 id="pending-discovery-title">New VPN server detected</h3>
        </div>
        <div className="modal-body" style={{ padding: "16px 20px" }}>
          <p className="settings-item-description" style={{ marginBottom: 14 }}>
            A new server was detected. Do you want to add it to the list?
          </p>
          <dl
            style={{
              margin: 0,
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "8px 16px",
              fontSize: 14,
            }}
          >
            <dt style={{ color: "var(--text-muted)" }}>API URL</dt>
            <dd style={{ margin: 0, wordBreak: "break-all" }}>{current.apiUrl || "—"}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Type</dt>
            <dd style={{ margin: 0 }}>{vpnServerTypeLabel(current.serverType)}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Public IP</dt>
            <dd style={{ margin: 0 }}>{current.publicIp || "—"}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Suggested name</dt>
            <dd style={{ margin: 0 }}>{current.suggestedName || "—"}</dd>
            {current.version ? (
              <>
                <dt style={{ color: "var(--text-muted)" }}>Version</dt>
                <dd style={{ margin: 0 }}>{current.version}</dd>
              </>
            ) : null}
          </dl>
          {discoveries.length > 1 ? (
            <p className="settings-item-description" style={{ marginTop: 12, marginBottom: 0 }}>
              {discoveries.length} pending discoveries — showing one at a time. Open all to review the
              full queue.
            </p>
          ) : null}
        </div>
        <div
          className="modal-footer"
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            flexWrap: "wrap",
            padding: "12px 20px 16px",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <button type="button" className="btn secondary" disabled={busy} onClick={handleLater}>
            Later
          </button>
          {discoveries.length > 1 ? (
            <button type="button" className="btn secondary" disabled={busy} onClick={handleOpenAll}>
              Open all ({discoveries.length})
            </button>
          ) : null}
          <button type="button" className="btn secondary" disabled={busy} onClick={handleReview}>
            Review…
          </button>
          <button type="button" className="btn primary" disabled={busy} onClick={() => void handleAdd()}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
