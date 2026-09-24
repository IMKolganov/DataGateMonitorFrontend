import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import {
  supportsPiHoleIntegration,
  vpnServerTypeLabel,
} from "../constants/vpnServerType";
import { errorMessage } from "../utils/errorMessage";
import {
  unwrapDiscoveryActionResult,
  unwrapPendingDiscoveries,
} from "../utils/servers/pendingServerDiscovery";
import {
  getGetApiOpenVpnServersDiscoveriesPendingQueryKey,
  getGetApiOpenVpnServersGetServerWithStatusVpnServerIdQueryKey,
  getGetApiOpenVpnServersGetVpnServerIdQueryKey,
  useGetApiOpenVpnServersDiscoveriesPending,
  usePostApiOpenVpnServersDiscoveriesDiscoveryIdApprove,
  usePostApiOpenVpnServersDiscoveriesDiscoveryIdDeny,
} from "../api/orval/vpn-servers/vpn-servers";
import { getGetApiV3OpenVpnServersGetAllWithStatusQueryKey } from "../api/orval/vpn-servers-v3/vpn-servers-v3";
import { useGetApiTagsGetAll } from "../api/orval/tags/tags";
import { usePostApiQuotaPlansGetAll } from "../api/orval/quota-plan/quota-plan";
import { getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey } from "../api/orval/quota-plan-allowed-server/quota-plan-allowed-server";
import type { VpnServersRequestsApproveVpnServerDiscoveryRequest } from "../api/orval/model/vpnServersRequestsApproveVpnServerDiscoveryRequest";
import type { QuotaPlanDto, QuotaPlansResponse } from "../api/orvalModelShim";
import { unwrapMaybeApiResponse } from "./TelegramBotSettings/unwrapApiResponse";
import "../css/ServerForm.css";
import "../css/Settings.css";

/**
 * Review / approve-with-edit / reject a single pending VPN discovery.
 */
export default function PendingServerDiscoveryReviewPage() {
  const { discoveryId: discoveryIdParam } = useParams<{ discoveryId: string }>();
  const discoveryId = Number(discoveryIdParam);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const pendingQuery = useGetApiOpenVpnServersDiscoveriesPending({
    query: { refetchOnWindowFocus: true },
  });
  const discoveries = useMemo(
    () => unwrapPendingDiscoveries(pendingQuery.data),
    [pendingQuery.data],
  );
  const discovery = useMemo(
    () => discoveries.find((d) => d.id === discoveryId) ?? null,
    [discoveries, discoveryId],
  );

  const [serverName, setServerName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [isEnableWss, setIsEnableWss] = useState(false);
  const [isPiHoleEnabled, setIsPiHoleEnabled] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedQuotaPlanIds, setSelectedQuotaPlanIds] = useState<number[]>([]);
  const [hydratedId, setHydratedId] = useState<number | null>(null);

  useEffect(() => {
    if (!discovery?.id || hydratedId === discovery.id) return;
    setServerName(discovery.suggestedName?.trim() || "");
    setApiUrl(discovery.apiUrl?.trim() || "");
    setIsEnableWss(Boolean(discovery.isEnableWss));
    setIsPiHoleEnabled(false);
    setIsDefault(false);
    setIsDisabled(false);
    setLatitude("");
    setLongitude("");
    setSelectedTagIds([]);
    setSelectedQuotaPlanIds([]);
    setHydratedId(discovery.id);
  }, [discovery, hydratedId]);

  const tagsQuery = useGetApiTagsGetAll();
  const allTags = useMemo(() => {
    const raw = tagsQuery.data as { tags?: { id?: number; name?: string | null }[] } | undefined;
    return (raw?.tags ?? []).filter((t): t is { id: number; name?: string | null } => typeof t.id === "number");
  }, [tagsQuery.data]);

  const getPlansMutation = usePostApiQuotaPlansGetAll();
  const [quotaPlans, setQuotaPlans] = useState<QuotaPlanDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await getPlansMutation.mutateAsync({ data: {} });
        const payload = unwrapMaybeApiResponse<QuotaPlansResponse>(
          raw as QuotaPlansResponse | { data?: QuotaPlansResponse } | undefined,
        );
        if (!cancelled) {
          setQuotaPlans((payload?.quotaPlans ?? []).filter((p): p is QuotaPlanDto & { id: number } => typeof p.id === "number"));
        }
      } catch {
        if (!cancelled) setQuotaPlans([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const approveMutation = usePostApiOpenVpnServersDiscoveriesDiscoveryIdApprove();
  const denyMutation = usePostApiOpenVpnServersDiscoveriesDiscoveryIdDeny();
  const busy = approveMutation.isPending || denyMutation.isPending;

  const invalidate = async (vpnServerId?: number | null) => {
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

  const parseOptionalNumber = (raw: string): number | undefined => {
    const t = raw.trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  };

  const handleApprove = async () => {
    if (!discovery?.id || busy) return;
    const name = serverName.trim();
    if (!name) {
      toast.error("Server name is required");
      return;
    }
    const url = apiUrl.trim();
    if (!url) {
      toast.error("API URL is required");
      return;
    }

    const data: VpnServersRequestsApproveVpnServerDiscoveryRequest = {
      serverName: name,
      apiUrl: url,
      isEnableWss,
      isPiHoleEnabled: supportsPiHoleIntegration(discovery.serverType) ? isPiHoleEnabled : false,
      isDefault,
      isDisabled,
      latitude: parseOptionalNumber(latitude),
      longitude: parseOptionalNumber(longitude),
      tagIds: selectedTagIds,
      quotaPlanIds: selectedQuotaPlanIds,
    };

    try {
      const raw = await approveMutation.mutateAsync({
        discoveryId: discovery.id,
        data,
      });
      const result = unwrapDiscoveryActionResult(raw);
      const vpnServerId = result?.vpnServerId ?? null;
      toast.success("Server added successfully!");
      await invalidate(vpnServerId);
      if (vpnServerId != null && vpnServerId > 0) {
        navigate(`/servers/edit/${vpnServerId}`);
      } else {
        navigate("/servers/pending-discoveries");
      }
    } catch (err) {
      toast.error(errorMessage(err) || "Failed to approve discovery");
    }
  };

  const handleReject = async () => {
    if (!discovery?.id || busy) return;
    if (!window.confirm(`Reject discovery for ${discovery.apiUrl || "this server"}?`)) return;
    try {
      await denyMutation.mutateAsync({ discoveryId: discovery.id, data: {} });
      toast.info("Discovery rejected");
      await invalidate();
      navigate("/servers/pending-discoveries");
    } catch (err) {
      toast.error(errorMessage(err) || "Failed to reject discovery");
    }
  };

  if (!Number.isFinite(discoveryId) || discoveryId <= 0) {
    return (
      <div className="content-wrapper">
        <p className="error-message">Invalid discovery id.</p>
        <Link to="/servers/pending-discoveries">Back to pending list</Link>
      </div>
    );
  }

  if (pendingQuery.isLoading) {
    return (
      <div className="content-wrapper">
        <p className="settings-item-description">Loading…</p>
      </div>
    );
  }

  if (!discovery) {
    return (
      <div className="content-wrapper wide-table">
        <div className="server-form-container">
          <p className="settings-item-description">
            This discovery is not pending anymore (already approved, rejected, or missing).
          </p>
          <Link to="/servers/pending-discoveries" className="btn secondary" style={{ textDecoration: "none" }}>
            Back to pending list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrapper wide-table">
      <div className="server-form-container">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => navigate("/servers/pending-discoveries")}
          >
            <span className="icon">{FaArrowLeft({ className: "icon" })}</span>
            Pending list
          </button>
          <h2 className="server-form-header" style={{ margin: 0, flex: 1, textAlign: "left" }}>
            Review server request
          </h2>
        </div>

        <dl
          style={{
            margin: "0 0 20px",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "8px 16px",
            fontSize: 14,
          }}
        >
          <dt style={{ color: "var(--text-muted)" }}>Type</dt>
          <dd style={{ margin: 0 }}>{vpnServerTypeLabel(discovery.serverType)}</dd>
          <dt style={{ color: "var(--text-muted)" }}>Public IP</dt>
          <dd style={{ margin: 0 }}>{discovery.publicIp || "—"}</dd>
          {discovery.version ? (
            <>
              <dt style={{ color: "var(--text-muted)" }}>Version</dt>
              <dd style={{ margin: 0 }}>{discovery.version}</dd>
            </>
          ) : null}
        </dl>

        <form
          className="server-form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleApprove();
          }}
        >
          <div className="form-group">
            <label htmlFor="discovery-server-name">Server Name *</label>
            <input
              id="discovery-server-name"
              type="text"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="Enter server name"
              disabled={busy}
            />
          </div>

          <div className="form-group">
            <label htmlFor="discovery-api-url">API URL *</label>
            <input
              id="discovery-api-url"
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://vpn.example.com:9443/"
              disabled={busy}
            />
            <p className="form-hint form-hint--mt-6">
              Fix the URL here if the node announced an IP instead of a domain.
            </p>
          </div>

          <div className="form-group checkbox-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                disabled={busy}
              />
              <div className="checkbox-content">
                <span className="checkbox-title">Default Server</span>
              </div>
            </label>
          </div>

          <div className="form-group checkbox-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isEnableWss}
                onChange={(e) => setIsEnableWss(e.target.checked)}
                disabled={busy}
              />
              <div className="checkbox-content">
                <span className="checkbox-title">Enable WSS</span>
              </div>
            </label>
          </div>

          <div className="form-group checkbox-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPiHoleEnabled}
                onChange={(e) => setIsPiHoleEnabled(e.target.checked)}
                disabled={busy || !supportsPiHoleIntegration(discovery.serverType)}
              />
              <div className="checkbox-content">
                <span className="checkbox-title">Enable Pi-hole integration</span>
              </div>
            </label>
          </div>

          <div className="form-group checkbox-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isDisabled}
                onChange={(e) => setIsDisabled(e.target.checked)}
                disabled={busy}
              />
              <div className="checkbox-content">
                <span className="checkbox-title">Disable background polling</span>
              </div>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="discovery-lat">Latitude</label>
            <input
              id="discovery-lat"
              type="text"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              disabled={busy}
              placeholder="optional"
            />
          </div>
          <div className="form-group">
            <label htmlFor="discovery-lng">Longitude</label>
            <input
              id="discovery-lng"
              type="text"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              disabled={busy}
              placeholder="optional"
            />
          </div>

          <div className="form-group">
            <label>Tags</label>
            <div className="tags-checkbox-list">
              {allTags.length === 0 ? (
                <span className="form-hint">No tags yet.</span>
              ) : (
                allTags.map((tag) => (
                  <div key={tag.id} className="tags-checkbox-item">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedTagIds.includes(tag.id)}
                        onChange={() => {
                          setSelectedTagIds((prev) =>
                            prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id],
                          );
                        }}
                        disabled={busy}
                      />
                      <span className="checkbox-content">{tag.name ?? ""}</span>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Quota plans</label>
            <div className="tags-checkbox-list">
              {quotaPlans.length === 0 ? (
                <span className="form-hint">No quota plans defined.</span>
              ) : (
                quotaPlans.map((plan) => {
                  const pid = plan.id!;
                  return (
                    <div key={pid} className="tags-checkbox-item">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedQuotaPlanIds.includes(pid)}
                          onChange={() => {
                            setSelectedQuotaPlanIds((prev) =>
                              prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid],
                            );
                          }}
                          disabled={busy}
                        />
                        <span className="checkbox-content">
                          {(plan.name?.trim() || `Plan #${pid}`) +
                            (plan.isActive === false ? " (inactive)" : "")}
                        </span>
                      </label>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="form-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="submit" className="btn primary" disabled={busy}>
              Approve &amp; add
            </button>
            <button type="button" className="btn secondary" disabled={busy} onClick={() => void handleReject()}>
              Reject
            </button>
            <button
              type="button"
              className="btn secondary"
              disabled={busy}
              onClick={() => navigate("/servers/pending-discoveries")}
            >
              Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
