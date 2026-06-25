import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FaGlobe, FaSave, FaSync } from "react-icons/fa";
import type { GridColDef } from "@mui/x-data-grid";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGetApiOpenVpnServersGetVpnServerIdQueryKey,
  putApiOpenVpnServersUpdate,
  useGetApiOpenVpnServersGetVpnServerId,
} from "../api/orval/vpn-servers/vpn-servers";
import { useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId } from "../api/orval/quota-plan-allowed-server/quota-plan-allowed-server";
import { useGetApiTagsGetAll } from "../api/orval/tags/tags";
import {
  getGetApiOpenVpnServersPiHoleConfigVpnServerIdQueryKey,
  postApiOpenVpnServersPiHoleConfigVpnServerIdApplyRuntime,
  putApiOpenVpnServersPiHoleConfig,
  useGetApiOpenVpnServersPiHoleConfigVpnServerId,
  useGetApiOpenVpnServersPiHoleConfigVpnServerIdDiagnostics,
} from "../api/orval/vpn-server-pi-hole-config/vpn-server-pi-hole-config";
import {
  getApiVpnDnsQueriesSearch,
  getGetApiVpnDnsQueriesSearchQueryKey,
} from "../api/orval/vpn-dns-query/vpn-dns-query";
import type {
  PiHoleDiagnosticsResponse,
  VpnDnsQueryLogDto,
  VpnDnsQueryPageResponse,
  VpnServerPiHoleConfigResponse,
  VpnServerResponse,
} from "../api/orvalModelShim";
import { PiHoleStatusPanel } from "../components/pihole/PiHoleStatusPanel";
import { isOpenVpnStack } from "../constants/vpnServerType";
import { OpenVpnServerFeaturePlaceholder } from "../components/servers/OpenVpnServerFeaturePlaceholder";
import { ServerAccessDenied } from "../components/ServerAccessDenied";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors";
import {
  buildUpdateServerRequest,
  resolveQuotaPlanIdsFromAllowedLinks,
  resolveTagIdsFromNames,
  unwrapAllowedQuotaPlanLinks,
} from "../utils/pihole/buildServerUpdateRequest";
import { errorMessage } from "../utils/errorMessage";
import { isHttpForbidden } from "../utils/httpError";
import StyledDataGrid from "../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../components/ui/ThemeProvider.tsx";
import { usePersistedPageSize } from "../hooks/usePersistedPageSize";
import { formatDateWithOffset } from "../utils/utils";
import "../css/ServerDetails.css";
import "../css/ServerForm.css";
import "../css/Settings.css";
import "../css/Table.css";

type FormState = {
  baseUrl: string;
  appPassword: string;
  pollIntervalSeconds: number;
  batchSize: number;
  lookbackSeconds: number;
  clientSubnetPrefix: string;
};

const defaultForm = (): FormState => ({
  baseUrl: "http://127.0.0.1:8080",
  appPassword: "",
  pollIntervalSeconds: 60,
  batchSize: 200,
  lookbackSeconds: 120,
  clientSubnetPrefix: "",
});

export function PiHoleServerTab() {
  const { vpnServerId = "" } = useParams<{ vpnServerId: string }>();
  const id = Number(vpnServerId);
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const admin = isAdmin(user);

  const [form, setForm] = useState<FormState>(defaultForm);
  const [enableIntegration, setEnableIntegration] = useState(false);
  const [domainFilter, setDomainFilter] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize("server-pihole-queries", 25, "10,25,50,100");
  const [saving, setSaving] = useState(false);

  const serverQuery = useGetApiOpenVpnServersGetVpnServerId(id, {
    query: { enabled: Number.isFinite(id) && id > 0, retry: 1 },
  });

  const tagsQuery = useGetApiTagsGetAll({ query: { enabled: admin && id > 0 } });
  const allowedPlansQuery = useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId(id, {
    query: { enabled: admin && id > 0 },
  });

  const payload = serverQuery.data as VpnServerResponse | undefined;
  const server = payload?.vpnServer;
  const piHoleEnabled = Boolean(server?.isPiHoleEnabled);

  useEffect(() => {
    setEnableIntegration(piHoleEnabled);
  }, [piHoleEnabled]);

  const configQuery = useGetApiOpenVpnServersPiHoleConfigVpnServerId(id, {
    query: { enabled: admin && id > 0 },
  });

  const configDto = (configQuery.data as VpnServerPiHoleConfigResponse | undefined)?.config;

  const diagnosticsQuery = useGetApiOpenVpnServersPiHoleConfigVpnServerIdDiagnostics(id, {
    query: {
      enabled: admin && id > 0,
      refetchInterval: piHoleEnabled ? 30_000 : false,
      staleTime: 10_000,
    },
  });

  const diagnostics = diagnosticsQuery.data as PiHoleDiagnosticsResponse | undefined;
  const diagnosticsError = diagnosticsQuery.isError ? errorMessage(diagnosticsQuery.error) : null;

  useEffect(() => {
    const cfg = (configQuery.data as VpnServerPiHoleConfigResponse | undefined)?.config;
    if (!cfg) return;
    setForm({
      baseUrl: cfg.baseUrl || defaultForm().baseUrl,
      appPassword: cfg.hasAppPassword ? "********" : "",
      pollIntervalSeconds: cfg.pollIntervalSeconds || 60,
      batchSize: cfg.batchSize || 200,
      lookbackSeconds: cfg.lookbackSeconds ?? 120,
      clientSubnetPrefix: cfg.clientSubnetPrefix ?? "",
    });
  }, [configQuery.data]);

  const allTags = useMemo(() => {
    const raw = tagsQuery.data as { tags?: { id?: number; name?: string | null }[] } | undefined;
    return raw?.tags ?? [];
  }, [tagsQuery.data]);

  const quotaPlanIds = useMemo(
    () => resolveQuotaPlanIdsFromAllowedLinks(unwrapAllowedQuotaPlanLinks(allowedPlansQuery.data)),
    [allowedPlansQuery.data],
  );

  const tagIds = useMemo(
    () => resolveTagIdsFromNames(server?.tags, allTags),
    [server?.tags, allTags],
  );

  const dnsParams = useMemo(
    () => ({
      VpnServerId: id,
      DomainContains: domainFilter.trim() || undefined,
      Page: page + 1,
      PageSize: pageSize,
    }),
    [id, domainFilter, page, pageSize],
  );

  const dnsQuery = useQuery({
    queryKey: getGetApiVpnDnsQueriesSearchQueryKey(dnsParams),
    enabled: admin && piHoleEnabled && id > 0,
    queryFn: () => getApiVpnDnsQueriesSearch(dnsParams),
  });

  const columns = useMemo<GridColDef<VpnDnsQueryLogDto>[]>(
    () => [
      {
        field: "queriedAtUtc",
        headerName: "Time (UTC)",
        flex: 1,
        minWidth: 170,
        valueFormatter: (v) => (v ? formatDateWithOffset(new Date(String(v))) : ""),
      },
      { field: "domain", headerName: "Domain", flex: 1.4, minWidth: 180 },
      { field: "status", headerName: "Status", width: 120 },
      {
        field: "externalId",
        headerName: "External ID",
        flex: 1,
        minWidth: 120,
        renderCell: (params) => {
          const extId = String(params.value ?? "").trim();
          if (!extId) return null;
          return (
            <Link to={`/servers/${id}/statistics/${encodeURIComponent(extId)}`} className="link-accent">
              {extId}
            </Link>
          );
        },
      },
      { field: "commonName", headerName: "CN", flex: 1, minWidth: 120 },
      { field: "clientIp", headerName: "Client IP", width: 130 },
    ],
    [id],
  );

  if (!admin) return <ServerAccessDenied />;
  if (serverQuery.isLoading) return <p>Loading server…</p>;
  if (isHttpForbidden(serverQuery.error)) return <ServerAccessDenied />;
  if (server && !isOpenVpnStack(server.serverType)) {
    return <OpenVpnServerFeaturePlaceholder vpnServerId={String(id)} featureLabel="Pi-hole DNS logging" />;
  }

  const onSave = async () => {
    if (!id || !server) return;
    if (!form.baseUrl.trim()) {
      toast.error("Pi-hole API base URL is required.");
      return;
    }

    setSaving(true);
    try {
      const password =
        form.appPassword === "********" || form.appPassword.trim() === ""
          ? undefined
          : form.appPassword.trim();

      await putApiOpenVpnServersPiHoleConfig({
        vpnServerId: id,
        baseUrl: form.baseUrl.trim(),
        appPassword: password,
        pollIntervalSeconds: form.pollIntervalSeconds,
        batchSize: form.batchSize,
        lookbackSeconds: form.lookbackSeconds,
        clientSubnetPrefix: form.clientSubnetPrefix.trim(),
      });

      const integrationChanged = enableIntegration !== piHoleEnabled;
      if (integrationChanged) {
        await putApiOpenVpnServersUpdate(
          buildUpdateServerRequest(server, {
            isPiHoleEnabled: enableIntegration,
            tagIds,
            quotaPlanIds,
          }),
        );
        await queryClient.invalidateQueries({ queryKey: getGetApiOpenVpnServersGetVpnServerIdQueryKey(id) });
      }

      if (enableIntegration) {
        await postApiOpenVpnServersPiHoleConfigVpnServerIdApplyRuntime(id);
        toast.success("Pi-hole settings saved and applied to the VPN server.");
        await diagnosticsQuery.refetch();
      } else {
        toast.success("Pi-hole settings saved in the dashboard. Enable integration to start collection.");
      }

      await queryClient.invalidateQueries({ queryKey: getGetApiOpenVpnServersPiHoleConfigVpnServerIdQueryKey(id) });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const saveLabel = enableIntegration ? "Save & apply" : "Save settings";

  return (
    <div className="server-details__root">
      <h2 className="settings-page__h2-with-icon">
        <FaGlobe className="icon" aria-hidden />
        Pi-hole DNS logging
      </h2>
      <p className="server-details__intro">
        Save connection settings in the dashboard first. When integration is enabled, the backend pushes them to the
        OpenVPN microservice and polls Pi-hole for VPN client DNS queries.
      </p>

      <PiHoleStatusPanel
        dashboardConfig={configDto}
        serverPiHoleEnabled={piHoleEnabled}
        serverApiUrl={server?.apiUrl}
        diagnostics={diagnostics}
        loading={piHoleEnabled ? diagnosticsQuery.isLoading : false}
        error={piHoleEnabled && diagnosticsQuery.isError ? diagnosticsError : null}
        refreshing={diagnosticsQuery.isFetching}
        onRefresh={() => void diagnosticsQuery.refetch()}
      />

      {!piHoleEnabled && (
        <div className="dco-stats-alert" role="note">
          <strong>Setup mode.</strong> Steps 2–6 are waiting. Fill connection settings, click <em>Save settings</em>,
          then enable integration and <em>Save &amp; apply</em>.
        </div>
      )}

      <section className="settings-card settings-card--mb">
        <h3 className="settings-card__h3-with-icon">Integration</h3>
        <div className="server-form">
          <div className="form-group checkbox-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={enableIntegration}
                onChange={(e) => setEnableIntegration(e.target.checked)}
                disabled={saving}
              />
              <div className="checkbox-content">
                <span className="checkbox-title">Enable Pi-hole integration</span>
                <span className="checkbox-description">
                  When enabled, the OpenVPN microservice polls Pi-hole and stores DNS queries in the dashboard.
                </span>
              </div>
            </label>
          </div>
        </div>
      </section>

      <section className="settings-card settings-card--mb">
        <h3 className="settings-card__h3-with-icon">Connection</h3>
        <div className="server-form">
          <div className="form-group">
            <label htmlFor="pihole-base-url">Pi-hole API base URL</label>
            <input
              id="pihole-base-url"
              type="url"
              value={form.baseUrl}
              onChange={(e) => setForm((p) => ({ ...p, baseUrl: e.target.value }))}
              placeholder="http://127.0.0.1:8080"
            />
          </div>
          <div className="form-group">
            <label htmlFor="pihole-app-password">Application password</label>
            <input
              id="pihole-app-password"
              type="password"
              value={form.appPassword}
              onChange={(e) => setForm((p) => ({ ...p, appPassword: e.target.value }))}
              placeholder={
                (configQuery.data as VpnServerPiHoleConfigResponse | undefined)?.config?.hasAppPassword
                  ? "Leave blank to keep current password"
                  : "Pi-hole app password"
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="pihole-poll-interval">Poll interval (sec)</label>
              <input
                id="pihole-poll-interval"
                type="number"
                min={10}
                max={3600}
                value={form.pollIntervalSeconds}
                onChange={(e) => setForm((p) => ({ ...p, pollIntervalSeconds: Number(e.target.value) }))}
              />
          </div>
          <div className="form-group">
            <label htmlFor="pihole-batch-size">Batch size</label>
              <input
                id="pihole-batch-size"
                type="number"
                min={1}
                max={10000}
                value={form.batchSize}
                onChange={(e) => setForm((p) => ({ ...p, batchSize: Number(e.target.value) }))}
              />
          </div>
          <div className="form-group">
            <label htmlFor="pihole-lookback">Lookback overlap (sec)</label>
              <input
                id="pihole-lookback"
                type="number"
                min={0}
                max={3600}
                value={form.lookbackSeconds}
                onChange={(e) => setForm((p) => ({ ...p, lookbackSeconds: Number(e.target.value) }))}
              />
          </div>
          <div className="form-group">
            <label htmlFor="pihole-subnet-prefix">VPN client subnet prefix</label>
            <input
              id="pihole-subnet-prefix"
              type="text"
              value={form.clientSubnetPrefix}
              onChange={(e) => setForm((p) => ({ ...p, clientSubnetPrefix: e.target.value }))}
              placeholder="10.51.30."
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn primary" onClick={() => void onSave()} disabled={saving}>
            <FaSave className="icon" /> {saving ? "Saving…" : saveLabel}
          </button>
        </div>
      </section>

      {piHoleEnabled && (
        <section className="settings-card">
          <h3 className="settings-card__h3-with-icon">Recent DNS queries (all users)</h3>
          <div className="header-bar">
            <div className="left-buttons">
              <button
                type="button"
                className="btn secondary"
                onClick={() => void dnsQuery.refetch()}
                disabled={dnsQuery.isFetching}
              >
                <FaSync className={`icon ${dnsQuery.isFetching ? "icon-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
          <div className="server-form">
            <div className="form-group">
              <label htmlFor="pihole-domain-filter">Domain contains</label>
              <input
                id="pihole-domain-filter"
                type="text"
                value={domainFilter}
                onChange={(e) => {
                  setDomainFilter(e.target.value);
                  setPage(0);
                }}
                placeholder="e.g. netflix"
              />
            </div>
          </div>
          <CustomThemeProvider>
            <div
              className="data-grid-wrap"
              style={{
                backgroundColor: "var(--bg-body)",
                padding: "10px",
                borderRadius: "8px",
              }}
            >
              <StyledDataGrid
                rows={(dnsQuery.data as VpnDnsQueryPageResponse | undefined)?.items ?? []}
                columns={columns}
                getRowId={(r) => r.id ?? 0}
                loading={dnsQuery.isLoading || dnsQuery.isFetching}
                rowCount={(dnsQuery.data as VpnDnsQueryPageResponse | undefined)?.totalCount ?? 0}
                paginationMode="server"
                paginationModel={{ page, pageSize }}
                onPaginationModelChange={(m) => {
                  setPage(m.page);
                  setPageSize(m.pageSize);
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                disableRowSelectionOnClick
                slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
                localeText={{ noRowsLabel: "📭 No DNS queries logged" }}
              />
            </div>
          </CustomThemeProvider>
        </section>
      )}
    </div>
  );
}

export default PiHoleServerTab;
