import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FaGlobe, FaSave, FaSync } from "react-icons/fa";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import type { GridColDef } from "@mui/x-data-grid";
import {
  getGetApiAvailabilityCheckStatusQueryKey,
  useGetApiAvailabilityCheckStatus,
  usePostApiAvailabilityCheckCheck,
  usePutApiAvailabilityCheckServersVpnServerId,
  usePutApiAvailabilityCheckSettings,
} from "../api/orval/availability-check/availability-check";
import { useGetApiOpenVpnServersGetVpnServerId } from "../api/orval/vpn-servers/vpn-servers";
import type {
  AvailabilityCheckServerResultDto,
  AvailabilityCheckStatusResponse,
  UpdateAvailabilityCheckServerSettingsRequest,
  UpdateAvailabilityCheckSettingsRequest,
  VpnServerResponse,
} from "../api/orvalModelShim";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors";
import { ServerAccessDenied } from "../components/ServerAccessDenied";
import Grid from "../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../components/ui/ThemeProvider.tsx";
import { useClientGridPagination } from "../hooks/useClientGridPagination";
import { errorMessage } from "../utils/errorMessage";
import { formatDateWithOffset } from "../utils/utils";
import "../css/Settings.css";
import "../css/ServerDetails.css";
import "../css/Table.css";

const DEFAULT_PROBE = "https://status.rackot.ru/check.cgi";

type ProbeRow = {
  id: number;
  server: string;
  apiUrl: string;
  checkEnabled: string;
  probe: string;
  probeOk: boolean;
  summary: string;
  checked: string;
  isCurrent: boolean;
};

function unwrapStatus(data: unknown): AvailabilityCheckStatusResponse | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as { data?: AvailabilityCheckStatusResponse } & AvailabilityCheckStatusResponse;
  if (obj.data && typeof obj.data === "object") return obj.data;
  if ("enabled" in obj || "probeUrl" in obj || "servers" in obj) return obj;
  return undefined;
}

function probeLabel(s: AvailabilityCheckServerResultDto): { label: string; ok: boolean } {
  if (s.isAvailabilityCheckEnabled === false) {
    return { label: "skipped", ok: true };
  }
  if (s.error) return { label: "error", ok: false };
  if (s.reachable == null) {
    return {
      label: s.isAvailableByExternalProbe ? "ok*" : "blocked",
      ok: Boolean(s.isAvailableByExternalProbe),
    };
  }
  return {
    label: s.reachable ? "reachable" : "unreachable",
    ok: Boolean(s.reachable),
  };
}

export function AvailabilityCheckServerTab() {
  const { vpnServerId = "" } = useParams<{ vpnServerId: string }>();
  const id = Number(vpnServerId);
  const user = getCurrentUser();
  const admin = isAdmin(user);
  const queryClient = useQueryClient();

  const [serverCheckEnabled, setServerCheckEnabled] = useState(true);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [probeUrl, setProbeUrl] = useState(DEFAULT_PROBE);
  const [intervalSeconds, setIntervalSeconds] = useState(300);

  const serverQuery = useGetApiOpenVpnServersGetVpnServerId(id, {
    query: {
      enabled: admin && Number.isFinite(id) && id > 0,
      staleTime: 10_000,
    },
  });
  const serverPayload = serverQuery.data as VpnServerResponse | undefined;
  const serverName = serverPayload?.vpnServer?.serverName ?? `#${vpnServerId}`;

  const statusQuery = useGetApiAvailabilityCheckStatus({
    query: { enabled: admin, staleTime: 15_000, refetchInterval: 60_000 },
  });

  const status = unwrapStatus(statusQuery.data);
  const thisServer = useMemo(
    () => status?.servers?.find((s) => s.vpnServerId === id),
    [status?.servers, id],
  );

  useEffect(() => {
    if (!status) return;
    setGlobalEnabled(Boolean(status.enabled));
    setProbeUrl(status.probeUrl?.trim() || DEFAULT_PROBE);
    const interval = Number(status.intervalSeconds);
    setIntervalSeconds(Number.isFinite(interval) && interval > 0 ? interval : 300);
  }, [status?.enabled, status?.probeUrl, status?.intervalSeconds]);

  useEffect(() => {
    if (thisServer) {
      setServerCheckEnabled(thisServer.isAvailabilityCheckEnabled !== false);
      return;
    }
    // Until first probe cycle includes this row, default to enabled.
    setServerCheckEnabled(true);
  }, [thisServer?.vpnServerId, thisServer?.isAvailabilityCheckEnabled]);

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: getGetApiAvailabilityCheckStatusQueryKey() });

  const saveGlobalMutation = usePutApiAvailabilityCheckSettings({
    mutation: {
      onSuccess: () => {
        toast.success("Shared probe settings saved.");
        invalidate();
      },
      onError: (err) => toast.error(errorMessage(err)),
    },
  });

  const saveServerMutation = usePutApiAvailabilityCheckServersVpnServerId({
    mutation: {
      onSuccess: () => {
        toast.success(
          serverCheckEnabled
            ? "Availability check enabled for this server."
            : "Availability check disabled for this server.",
        );
        invalidate();
      },
      onError: (err) => toast.error(errorMessage(err)),
    },
  });

  const checkMutation = usePostApiAvailabilityCheckCheck({
    mutation: {
      onSuccess: () => {
        toast.success("Probe completed.");
        invalidate();
      },
      onError: (err) => toast.error(errorMessage(err)),
    },
  });

  const servers = status?.servers ?? [];
  const { gridProps } = useClientGridPagination({
    storageKey: `settings-availability-check-servers-${id || "all"}`,
    defaultPageSize: 25,
    allowedKey: "10,25,50,100",
  });

  const rows: ProbeRow[] = useMemo(
    () =>
      servers.map((s) => {
        const { label, ok } = probeLabel(s);
        const checkedAt = s.checkedAtUtc
          ? formatDateWithOffset(new Date(s.checkedAtUtc))
          : "—";
        const duration = s.durationMs != null ? ` (${s.durationMs} ms)` : "";
        const isCurrent = s.vpnServerId === id;
        return {
          id: s.vpnServerId ?? 0,
          server: `${isCurrent ? "★ " : ""}#${s.vpnServerId ?? "?"} ${s.serverName ?? ""}`.trim(),
          apiUrl: s.apiUrl?.trim() || "—",
          checkEnabled: s.isAvailabilityCheckEnabled === false ? "off" : "on",
          probe: label,
          probeOk: ok,
          summary: s.summary || s.error || "—",
          checked: `${checkedAt}${duration}`,
          isCurrent,
        };
      }),
    [servers, id],
  );

  const columns: GridColDef<ProbeRow>[] = useMemo(
    () => [
      { field: "server", headerName: "Server", flex: 1, minWidth: 180 },
      {
        field: "checkEnabled",
        headerName: "Check",
        width: 90,
      },
      {
        field: "apiUrl",
        headerName: "ApiUrl",
        flex: 1.4,
        minWidth: 220,
        renderCell: (params) => (
          <span style={{ wordBreak: "break-all" }} title={String(params.value)}>
            {String(params.value)}
          </span>
        ),
      },
      {
        field: "probe",
        headerName: "Probe",
        width: 130,
        renderCell: (params) => (
          <strong
            className={
              params.row.probeOk ? "pihole-step-value--ok" : "pihole-step-value--error"
            }
          >
            {params.value}
          </strong>
        ),
      },
      { field: "summary", headerName: "Summary", flex: 1.2, minWidth: 160 },
      { field: "checked", headerName: "Checked", width: 220 },
    ],
    [],
  );

  if (!admin) return <ServerAccessDenied />;

  const busy =
    saveGlobalMutation.isPending || saveServerMutation.isPending || checkMutation.isPending;

  const saveServer = () => {
    if (!Number.isFinite(id) || id <= 0) {
      toast.error("Invalid server id.");
      return;
    }
    const body: UpdateAvailabilityCheckServerSettingsRequest = {
      enabled: serverCheckEnabled,
    };
    saveServerMutation.mutate({ vpnServerId: id, data: body });
  };

  const saveGlobal = () => {
    const body: UpdateAvailabilityCheckSettingsRequest = {
      enabled: globalEnabled,
      probeUrl: probeUrl.trim() || DEFAULT_PROBE,
      intervalSeconds: Math.max(60, Math.min(86_400, Number(intervalSeconds) || 300)),
    };
    saveGlobalMutation.mutate({ data: body });
  };

  return (
    <div>
      <h2 className="settings-page__h2-with-icon">
        <FaGlobe className="icon" aria-hidden />
        <span>Check available — {serverQuery.isLoading ? "…" : serverName}</span>
      </h2>
      <div className="settings-divider" />

      <p className="settings-item-description">
        Toggle whether <strong>this server</strong> is included in the external availability probe.
        Probe results are stored as <code>IsAvailableByExternalProbe</code> and combined with manager{" "}
        <code>IsOnline</code> for the Online badge. Shared interval / probe URL apply to all servers.
      </p>

      <div className="settings-group">
        <h4>This server</h4>
        <div className="settings-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={serverCheckEnabled}
              onChange={(e) => setServerCheckEnabled(e.target.checked)}
              disabled={busy || !Number.isFinite(id) || id <= 0}
            />
            <span className="checkbox-title">Enable availability check for this server</span>
          </label>
        </div>
        {thisServer ? (
          <p className="settings-item-description">
            Last probe:{" "}
            <strong
              className={
                probeLabel(thisServer).ok ? "pihole-step-value--ok" : "pihole-step-value--error"
              }
            >
              {probeLabel(thisServer).label}
            </strong>
            {" — "}
            {thisServer.summary || thisServer.error || "—"}
            {thisServer.checkedAtUtc
              ? ` (${formatDateWithOffset(new Date(thisServer.checkedAtUtc))})`
              : ""}
          </p>
        ) : (
          <p className="settings-item-description">
            No probe row for this server yet — run Check now or wait for the next cycle.
          </p>
        )}
        <div className="settings-item" style={{ gap: 8 }}>
          <button type="button" className="btn primary" disabled={busy} onClick={saveServer}>
            <FaSave className="icon" aria-hidden /> Save for this server
          </button>
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={() => checkMutation.mutate()}
          >
            <FaSync className={`icon${checkMutation.isPending ? " spin" : ""}`} aria-hidden /> Check
            now
          </button>
        </div>
      </div>

      <div className="settings-group" style={{ marginTop: 24 }}>
        <h4>Shared probe settings</h4>
        <div className="settings-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={globalEnabled}
              onChange={(e) => setGlobalEnabled(e.target.checked)}
              disabled={busy}
            />
            <span className="checkbox-title">Global kill-switch (all servers)</span>
          </label>
        </div>
        <div className="settings-item">
          <label htmlFor="availability-check-interval">Interval (seconds)</label>
          <input
            id="availability-check-interval"
            className="input"
            type="number"
            min={60}
            max={86400}
            step={30}
            value={intervalSeconds}
            onChange={(e) => setIntervalSeconds(Number(e.target.value))}
            disabled={busy}
          />
        </div>
        <p className="settings-item-description">
          How often the background service runs probes. Allowed range: 60–86400 seconds (default 300).
        </p>
        <div className="settings-item">
          <label htmlFor="availability-check-probe-url">Probe URL</label>
          <input
            id="availability-check-probe-url"
            className="input"
            type="url"
            value={probeUrl}
            onChange={(e) => setProbeUrl(e.target.value)}
            disabled={busy}
            placeholder={DEFAULT_PROBE}
          />
        </div>
        <p className="settings-item-description">
          Must accept <code>?target=</code> and return the shared probe JSON. Default: {DEFAULT_PROBE}
        </p>
        <div className="settings-item" style={{ gap: 8 }}>
          <button type="button" className="btn secondary" disabled={busy} onClick={saveGlobal}>
            <FaSave className="icon" aria-hidden /> Save shared settings
          </button>
        </div>
      </div>

      <h3 className="settings-card__h3-with-icon" style={{ marginTop: 24 }}>
        <FaGlobe className="icon" aria-hidden />
        <span>All servers{rows.length > 0 ? ` (${rows.length})` : ""}</span>
      </h3>
      <div className="settings-divider" />

      <p className="settings-item-description">
        Last cycle:{" "}
        {status?.lastCheckedAtUtc
          ? formatDateWithOffset(new Date(status.lastCheckedAtUtc))
          : "—"}
        . Current server marked with ★.
      </p>

      {statusQuery.isError ? (
        <p className="error-message">{errorMessage(statusQuery.error)}</p>
      ) : null}

      <CustomThemeProvider>
        <div
          className="data-grid-wrap"
          style={{ backgroundColor: "var(--bg-body)", padding: 10, borderRadius: 8 }}
        >
          <Grid
            gridId="availability-check-servers"
            rows={rows}
            columns={columns}
            loading={statusQuery.isLoading || statusQuery.isFetching}
            getRowClassName={(params) => (params.row.isCurrent ? "row-current-server" : "")}
            {...gridProps}
            slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
            localeText={{ noRowsLabel: "No servers probed yet." }}
          />
        </div>
      </CustomThemeProvider>
    </div>
  );
}

export default AvailabilityCheckServerTab;
