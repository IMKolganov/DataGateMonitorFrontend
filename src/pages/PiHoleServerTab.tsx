import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FaGlobe, FaSave, FaSync } from "react-icons/fa";
import type { GridColDef } from "@mui/x-data-grid";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetApiOpenVpnServersGetVpnServerId } from "../api/orval/vpn-servers/vpn-servers";
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
import { isHttpForbidden } from "../utils/httpError";
import StyledDataGrid from "../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../components/ui/ThemeProvider.tsx";
import { usePersistedPageSize } from "../hooks/usePersistedPageSize";
import { formatDateWithOffset } from "../utils/utils";
import "../css/ServerDetails.css";
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
  const [domainFilter, setDomainFilter] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize("server-pihole-queries", 25, "10,25,50,100");
  const [saving, setSaving] = useState(false);

  const serverQuery = useGetApiOpenVpnServersGetVpnServerId(id, {
    query: { enabled: Number.isFinite(id) && id > 0, retry: 1 },
  });

  const payload = serverQuery.data as VpnServerResponse | undefined;
  const server = payload?.vpnServer;
  const piHoleEnabled = Boolean(server?.isPiHoleEnabled);

  const configQuery = useGetApiOpenVpnServersPiHoleConfigVpnServerId(id, {
    query: { enabled: admin && piHoleEnabled && id > 0 },
  });

  const diagnosticsQuery = useGetApiOpenVpnServersPiHoleConfigVpnServerIdDiagnostics(id, {
    query: {
      enabled: admin && piHoleEnabled && id > 0,
      refetchInterval: 30_000,
      staleTime: 10_000,
    },
  });

  const diagnostics = diagnosticsQuery.data as PiHoleDiagnosticsResponse | undefined;
  const diagnosticsError =
    diagnosticsQuery.error instanceof Error
      ? diagnosticsQuery.error.message
      : diagnosticsQuery.isError
        ? "Failed to load Pi-hole diagnostics"
        : null;

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
      { field: "externalId", headerName: "External ID", flex: 1, minWidth: 120 },
      { field: "commonName", headerName: "CN", flex: 1, minWidth: 120 },
      { field: "clientIp", headerName: "Client IP", width: 130 },
    ],
    [],
  );

  if (!admin) return <ServerAccessDenied />;
  if (serverQuery.isLoading) return <p>Loading server…</p>;
  if (isHttpForbidden(serverQuery.error)) return <ServerAccessDenied />;
  if (server && !isOpenVpnStack(server.serverType)) {
    return <OpenVpnServerFeaturePlaceholder vpnServerId={String(id)} featureLabel="Pi-hole DNS logging" />;
  }
  if (!piHoleEnabled) {
    return (
      <div className="server-details__panel">
        <h2>Pi-hole</h2>
        <p>Pi-hole integration is disabled for this server. Enable it in server settings (edit server).</p>
      </div>
    );
  }

  const onSave = async () => {
    if (!id) return;
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

      await postApiOpenVpnServersPiHoleConfigVpnServerIdApplyRuntime(id);

      toast.success("Pi-hole settings saved and applied to the VPN server.");
      await queryClient.invalidateQueries({ queryKey: getGetApiOpenVpnServersPiHoleConfigVpnServerIdQueryKey(id) });
      await diagnosticsQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save Pi-hole settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="server-details__panel">
      <h2><FaGlobe /> Pi-hole DNS logging</h2>
      <p className="muted">
        Settings are stored in the dashboard and applied to the OpenVPN microservice via the backend.
        Status refreshes every 30 seconds.
      </p>

      <PiHoleStatusPanel
        diagnostics={diagnostics}
        loading={diagnosticsQuery.isLoading}
        error={diagnosticsError}
        refreshing={diagnosticsQuery.isFetching}
        onRefresh={() => void diagnosticsQuery.refetch()}
      />

      <section className="settings-section">
        <h3>Connection</h3>
        <div className="form-grid">
          <label>
            Pi-hole API base URL
            <input
              type="url"
              value={form.baseUrl}
              onChange={(e) => setForm((p) => ({ ...p, baseUrl: e.target.value }))}
              placeholder="http://127.0.0.1:8080"
            />
          </label>
          <label>
            Application password
            <input
              type="password"
              value={form.appPassword}
              onChange={(e) => setForm((p) => ({ ...p, appPassword: e.target.value }))}
              placeholder={(configQuery.data as VpnServerPiHoleConfigResponse | undefined)?.config?.hasAppPassword ? "********" : "Pi-hole app password"}
            />
          </label>
          <label>
            Poll interval (sec)
            <input
              type="number"
              min={10}
              max={3600}
              value={form.pollIntervalSeconds}
              onChange={(e) => setForm((p) => ({ ...p, pollIntervalSeconds: Number(e.target.value) }))}
            />
          </label>
          <label>
            Batch size
            <input
              type="number"
              min={1}
              max={10000}
              value={form.batchSize}
              onChange={(e) => setForm((p) => ({ ...p, batchSize: Number(e.target.value) }))}
            />
          </label>
          <label>
            Lookback overlap (sec)
            <input
              type="number"
              min={0}
              max={3600}
              value={form.lookbackSeconds}
              onChange={(e) => setForm((p) => ({ ...p, lookbackSeconds: Number(e.target.value) }))}
            />
          </label>
          <label>
            VPN client subnet prefix
            <input
              type="text"
              value={form.clientSubnetPrefix}
              onChange={(e) => setForm((p) => ({ ...p, clientSubnetPrefix: e.target.value }))}
              placeholder="10.51.30."
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={() => void onSave()} disabled={saving}>
            <FaSave /> {saving ? "Saving…" : "Save & apply"}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__header">
          <h3>Recent DNS queries (all users)</h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void dnsQuery.refetch()}>
            <FaSync /> Refresh
          </button>
        </div>
        <div className="form-row" style={{ marginBottom: 8 }}>
          <label>
            Domain contains
            <input
              type="text"
              value={domainFilter}
              onChange={(e) => {
                setDomainFilter(e.target.value);
                setPage(0);
              }}
            />
          </label>
        </div>
        <CustomThemeProvider>
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
            autoHeight
            disableRowSelectionOnClick
          />
        </CustomThemeProvider>
      </section>
    </div>
  );
}

export default PiHoleServerTab;
