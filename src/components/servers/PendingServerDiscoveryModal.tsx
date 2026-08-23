import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { vpnServerTypeLabel } from "../../constants/vpnServerType";
import { errorMessage } from "../../utils/errorMessage";
import { unwrapMaybeApiResponse } from "../../pages/TelegramBotSettings/unwrapApiResponse";
import {
  getGetApiOpenVpnServersDiscoveriesPendingQueryKey,
  getGetApiOpenVpnServersGetServerWithStatusVpnServerIdQueryKey,
  getGetApiOpenVpnServersGetVpnServerIdQueryKey,
  useGetApiOpenVpnServersDiscoveriesPending,
  usePostApiOpenVpnServersDiscoveriesDiscoveryIdApprove,
  usePostApiOpenVpnServersDiscoveriesDiscoveryIdDeny,
} from "../../api/orval/vpn-servers/vpn-servers";
import { getGetApiV3OpenVpnServersGetAllWithStatusQueryKey } from "../../api/orval/vpn-servers-v3/vpn-servers-v3";
import { getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey } from "../../api/orval/quota-plan-allowed-server/quota-plan-allowed-server";
import type { VpnServersDtoVpnServerDiscoveryDto } from "../../api/orval/model/vpnServersDtoVpnServerDiscoveryDto";
import type { VpnServersResponsesVpnServerDiscoveriesResponse } from "../../api/orval/model/vpnServersResponsesVpnServerDiscoveriesResponse";
import type { VpnServersResponsesVpnServerDiscoveryResponse } from "../../api/orval/model/vpnServersResponsesVpnServerDiscoveryResponse";
import {
  OPEN_PENDING_SERVER_DISCOVERY_EVENT,
  type OpenPendingServerDiscoveryDetail,
} from "./pendingServerDiscoveryEvents";
import "../../css/Settings.css";

const POLL_MS = 30_000;

function unwrapDiscoveries(raw: unknown): VpnServersDtoVpnServerDiscoveryDto[] {
  const payload = unwrapMaybeApiResponse<VpnServersResponsesVpnServerDiscoveriesResponse>(
    raw as
      | VpnServersResponsesVpnServerDiscoveriesResponse
      | { data?: VpnServersResponsesVpnServerDiscoveriesResponse }
      | undefined,
  );
  return payload?.discoveries ?? [];
}

function unwrapDiscoveryResult(raw: unknown): VpnServersResponsesVpnServerDiscoveryResponse | undefined {
  return unwrapMaybeApiResponse<VpnServersResponsesVpnServerDiscoveryResponse>(
    raw as
      | VpnServersResponsesVpnServerDiscoveryResponse
      | { data?: VpnServersResponsesVpnServerDiscoveryResponse }
      | undefined,
  );
}

/**
 * Admin-only modal: polls pending VPN discoveries and prompts to Add or Dismiss one at a time.
 */
export function PendingServerDiscoveryModal() {
  const user = getCurrentUser();
  const admin = isAdmin(user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [preferredDiscoveryId, setPreferredDiscoveryId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const pendingQuery = useGetApiOpenVpnServersDiscoveriesPending({
    query: {
      enabled: admin,
      refetchInterval: admin ? POLL_MS : false,
      refetchOnWindowFocus: admin,
    },
  });

  useEffect(() => {
    if (!admin) return;
    const onOpen = (ev: Event) => {
      const detail = (ev as CustomEvent<OpenPendingServerDiscoveryDetail>).detail;
      if (detail?.discoveryId != null && Number.isFinite(detail.discoveryId)) {
        setPreferredDiscoveryId(detail.discoveryId);
      }
      void pendingQuery.refetch();
    };
    window.addEventListener(OPEN_PENDING_SERVER_DISCOVERY_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PENDING_SERVER_DISCOVERY_EVENT, onOpen);
  }, [admin, pendingQuery]);

  const discoveries = useMemo(() => unwrapDiscoveries(pendingQuery.data), [pendingQuery.data]);

  const current = useMemo(() => {
    if (discoveries.length === 0) return null;
    if (preferredDiscoveryId != null) {
      const preferred = discoveries.find((d) => d.id === preferredDiscoveryId);
      if (preferred) return preferred;
    }
    return discoveries[0] ?? null;
  }, [discoveries, preferredDiscoveryId]);

  const approveMutation = usePostApiOpenVpnServersDiscoveriesDiscoveryIdApprove();
  const denyMutation = usePostApiOpenVpnServersDiscoveriesDiscoveryIdDeny();

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
          // Defaults; backend ORs isEnableWss with the discovery flag.
          isEnableWss: current.isEnableWss ?? false,
          serverName: current.suggestedName ?? undefined,
        },
      });
      const result = unwrapDiscoveryResult(raw);
      const vpnServerId = result?.vpnServerId ?? null;
      toast.success("Server added successfully!");
      setPreferredDiscoveryId(null);
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

  const handleDismiss = async () => {
    if (!current?.id || busy) return;
    setBusy(true);
    try {
      await denyMutation.mutateAsync({ discoveryId: current.id, data: {} });
      toast.info("Discovery dismissed");
      setPreferredDiscoveryId(null);
      await invalidateServerLists();
    } catch (err) {
      toast.error(errorMessage(err) || "Failed to dismiss discovery");
    } finally {
      setBusy(false);
    }
  };

  if (!admin || !current) return null;

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
              {discoveries.length} pending discoveries — showing one at a time.
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
          <button type="button" className="btn secondary" disabled={busy} onClick={() => void handleDismiss()}>
            Dismiss
          </button>
          <button type="button" className="btn primary" disabled={busy} onClick={() => void handleAdd()}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
