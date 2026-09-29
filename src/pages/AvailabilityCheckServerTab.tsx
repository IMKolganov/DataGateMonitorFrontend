import { useEffect, useMemo, useState } from "react";
import { FaGlobe, FaSave, FaSync } from "react-icons/fa";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import type { GridColDef } from "@mui/x-data-grid";
import {
  getGetApiAvailabilityCheckStatusQueryKey,
  useGetApiAvailabilityCheckStatus,
  usePostApiAvailabilityCheckCheck,
  usePutApiAvailabilityCheckSettings,
} from "../api/orval/availability-check/availability-check";
import type {
  AvailabilityCheckServerResultDto,
  AvailabilityCheckStatusResponse,
  UpdateAvailabilityCheckSettingsRequest,
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
  probe: string;
  probeOk: boolean;
  summary: string;
  checked: string;
};

function unwrapStatus(data: unknown): AvailabilityCheckStatusResponse | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as { data?: AvailabilityCheckStatusResponse } & AvailabilityCheckStatusResponse;
  if (obj.data && typeof obj.data === "object") return obj.data;
  if ("enabled" in obj || "probeUrl" in obj || "servers" in obj) return obj;
  return undefined;
}

function probeLabel(s: AvailabilityCheckServerResultDto): { label: string; ok: boolean } {
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
  const user = getCurrentUser();
  const admin = isAdmin(user);
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(true);
  const [probeUrl, setProbeUrl] = useState(DEFAULT_PROBE);

  const statusQuery = useGetApiAvailabilityCheckStatus({
    query: { enabled: admin, staleTime: 15_000, refetchInterval: 60_000 },
  });

  const status = unwrapStatus(statusQuery.data);

  useEffect(() => {
    if (!status) return;
    setEnabled(Boolean(status.enabled));
    setProbeUrl(status.probeUrl?.trim() || DEFAULT_PROBE);
  }, [status?.enabled, status?.probeUrl]);

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: getGetApiAvailabilityCheckStatusQueryKey() });

  const saveMutation = usePutApiAvailabilityCheckSettings({
    mutation: {
      onSuccess: () => {
        toast.success("Availability check settings saved.");
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
    storageKey: "settings-availability-check-servers",
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
        return {
          id: s.vpnServerId ?? 0,
          server: `#${s.vpnServerId ?? "?"} ${s.serverName ?? ""}`.trim(),
          apiUrl: s.apiUrl?.trim() || "—",
          probe: label,
          probeOk: ok,
          summary: s.summary || s.error || "—",
          checked: `${checkedAt}${duration}`,
        };
      }),
    [servers],
  );

  const columns: GridColDef<ProbeRow>[] = useMemo(
    () => [
      { field: "server", headerName: "Server", flex: 1, minWidth: 180 },
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

  const busy = saveMutation.isPending || checkMutation.isPending;

  const save = () => {
    const body: UpdateAvailabilityCheckSettingsRequest = {
      enabled,
      probeUrl: probeUrl.trim() || DEFAULT_PROBE,
    };
    saveMutation.mutate({ data: body });
  };

  return (
    <div>
      <h2 className="settings-page__h2-with-icon">
        <FaGlobe className="icon" aria-hidden />
        <span>Check available service</span>
      </h2>
      <div className="settings-divider" />

      <p className="settings-item-description">
        Every 5 minutes (when enabled) each VPN server&apos;s <code>ApiUrl</code> is probed through a
        compatible endpoint (default{" "}
        <a href="https://status.rackot.ru/" target="_blank" rel="noreferrer">
          status.rackot.ru
        </a>
        ). Results are stored as <code>IsAvailableByExternalProbe</code> and combined with manager{" "}
        <code>IsOnline</code> for the dashboard Online badge — pollers never overwrite the probe flag.
      </p>

      <div className="settings-group">
        <h4>Settings</h4>
        <div className="settings-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={busy}
            />
            <span className="checkbox-title">Enable availability checks</span>
          </label>
        </div>
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
          <button type="button" className="btn primary" disabled={busy} onClick={save}>
            <FaSave className="icon" aria-hidden /> Save
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

      <h3 className="settings-card__h3-with-icon" style={{ marginTop: 24 }}>
        <FaGlobe className="icon" aria-hidden />
        <span>Servers{rows.length > 0 ? ` (${rows.length})` : ""}</span>
      </h3>
      <div className="settings-divider" />

      <p className="settings-item-description">
        Last cycle:{" "}
        {status?.lastCheckedAtUtc
          ? formatDateWithOffset(new Date(status.lastCheckedAtUtc))
          : "—"}
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
