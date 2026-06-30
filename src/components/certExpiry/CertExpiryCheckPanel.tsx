import { useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { FaEye, FaPlay, FaSync } from "react-icons/fa";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import Grid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import {
  getApiCertExpiryRunsRunId,
  getGetApiCertExpiryRunsQueryKey,
  useGetApiCertExpiryRuns,
  usePostApiCertExpiryCheck,
} from "../../api/orval/cert-expiry/cert-expiry.ts";
import type {
  CertExpiryCheckRunResponse,
  CertExpiryRunSummaryDto,
  GetCertExpiryRunsResponse,
} from "../../api/orvalModelShim";
import type { CertExpiryDtoCertExpiryProfileResultDto } from "../../api/orval/model/certExpiryDtoCertExpiryProfileResultDto";
import type { CertExpiryDtoCertExpiryServerResultDto } from "../../api/orval/model/certExpiryDtoCertExpiryServerResultDto";
import { EnumsCertExpiryServerFetchStatus } from "../../api/orval/model/enumsCertExpiryServerFetchStatus";
import { formatDateWithOffset } from "../../utils/utils.ts";
import { errorMessage } from "../../utils/errorMessage.ts";
import {
  certExpiryProfileOutcomeLabel,
  certExpiryRunHasIssues,
  certExpiryRunStatusLabel,
} from "../../utils/certExpiryLabels.ts";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize.ts";
import "../../css/Settings.css";
import "../../css/Table.css";

/** ogmMutator unwraps ApiResponse.data at runtime; Orval types still use the Api* wrapper. */
function unwrapCertExpiryRun(raw: unknown): CertExpiryCheckRunResponse {
  return raw as CertExpiryCheckRunResponse;
}

function unwrapCertExpiryRuns(raw: unknown): CertExpiryRunSummaryDto[] {
  const payload = raw as GetCertExpiryRunsResponse | null | undefined;
  return payload?.runs ?? [];
}

type Props = {
  vpnServerId?: number;
  serverName?: string;
  showHistory?: boolean;
  historyLimit?: number;
};

export function CertExpiryCheckPanel({
  vpnServerId,
  serverName,
  showHistory = true,
  historyLimit = 20,
}: Props) {
  const queryClient = useQueryClient();
  const [sendNotifications, setSendNotifications] = useState(false);
  const [lastResult, setLastResult] = useState<CertExpiryCheckRunResponse | null>(null);
  const [detailRun, setDetailRun] = useState<CertExpiryCheckRunResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const historyParams = useMemo(
    () => ({ limit: historyLimit, vpnServerId: vpnServerId ?? undefined }),
    [historyLimit, vpnServerId],
  );

  const historyQuery = useGetApiCertExpiryRuns(historyParams, {
    query: { enabled: showHistory, staleTime: 5_000 },
  });

  const checkMutation = usePostApiCertExpiryCheck({
    mutation: {
      onSuccess: (result) => {
        const run = unwrapCertExpiryRun(result);
        setLastResult(run);
        void queryClient.invalidateQueries({ queryKey: getGetApiCertExpiryRunsQueryKey(historyParams) });
        if (certExpiryRunHasIssues(run)) {
          toast.warn("Certificate expiry check finished with findings.");
        } else {
          toast.success("Certificate expiry check completed successfully.");
        }
      },
      onError: (err) => toast.error(errorMessage(err)),
    },
  });

  const [pageSize, setPageSize] = usePersistedPageSize(
    vpnServerId ? `cert-expiry-history:${vpnServerId}` : "cert-expiry-history:all",
    10,
    "5,10,20,50",
  );

  const runCheck = () => {
    checkMutation.mutate({
      data: {
        vpnServerId: vpnServerId ?? undefined,
        sendNotifications,
      },
    });
  };

  const openRunDetails = async (runId: string) => {
    setDetailLoading(true);
    try {
      setDetailRun(unwrapCertExpiryRun(await getApiCertExpiryRunsRunId(runId)));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const historyRows = useMemo(() => {
    if (!historyQuery.data) return [];
    return unwrapCertExpiryRuns(historyQuery.data).map((r: CertExpiryRunSummaryDto, idx: number) => ({
      ...r,
      id: r.runId ?? `run-${idx}`,
    }));
  }, [historyQuery.data]);

  const historyColumns: GridColDef[] = [
    {
      field: "startedAtUtc",
      headerName: "Started",
      width: 170,
      valueFormatter: (value) => (value ? formatDateWithOffset(new Date(String(value))) : "—"),
    },
    { field: "scopeLabel", headerName: "Scope", flex: 0.35, minWidth: 160 },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      valueFormatter: (value) => certExpiryRunStatusLabel(value),
    },
    {
      field: "durationMs",
      headerName: "Duration",
      width: 100,
      valueFormatter: (value) => (value != null ? `${value} ms` : "—"),
    },
    { field: "profilesChecked", headerName: "Profiles", width: 90 },
    { field: "expired", headerName: "Expired", width: 90 },
    { field: "expiringSoon", headerName: "Expiring", width: 100 },
    { field: "missingOnNode", headerName: "Missing", width: 100 },
    { field: "serverFailures", headerName: "Server err.", width: 110 },
    {
      field: "actions",
      headerName: "Details",
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <button
          type="button"
          className="btn secondary"
          style={{ padding: "2px 8px", minHeight: 28 }}
          onClick={() => void openRunDetails(String(params.row.runId))}
        >
          <FaEye className="icon" aria-hidden />
        </button>
      ),
    },
  ];

  const resultBanner = lastResult ? (
    <div className={certExpiryRunHasIssues(lastResult) ? "message-error" : "message-success"} style={{ marginTop: 12 }}>
      <strong>{certExpiryRunStatusLabel(lastResult.status)}</strong>
      {" — "}
      {lastResult.scopeLabel}
      {lastResult.durationMs != null ? ` (${lastResult.durationMs} ms)` : ""}
      {lastResult.errorMessage ? `: ${lastResult.errorMessage}` : ""}
      {!lastResult.errorMessage && lastResult.summary ? (
        <>
          {" — "}
          profiles {lastResult.summary.profilesChecked}, expired {lastResult.summary.expired}, expiring{" "}
          {lastResult.summary.expiringSoon}, missing {lastResult.summary.missingOnNode}, server errors{" "}
          {lastResult.summary.serverFailures}
        </>
      ) : null}{" "}
      <button type="button" className="btn secondary" style={{ marginLeft: 8 }} onClick={() => setDetailRun(lastResult)}>
        View details
      </button>
    </div>
  ) : null;

  const running = checkMutation.isPending;

  return (
    <div className="settings-group">
      <p className="settings-item-description">
        Compares active issued OVPN profiles in the database with PKI certificates on OpenVPN nodes.
        Manual runs report findings only unless notifications are enabled.
        {serverName ? ` Current server: ${serverName}.` : null}
      </p>

      <div className="settings-item" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label className="settings-item-description" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <input
            type="checkbox"
            checked={sendNotifications}
            onChange={(e) => setSendNotifications(e.target.checked)}
            disabled={running}
          />
          Send admin notifications for this run
        </label>
        <button type="button" className="btn primary" onClick={runCheck} disabled={running}>
          <FaPlay className="icon" aria-hidden />
          {running ? "Running check…" : vpnServerId ? "Check this server" : "Check all eligible servers"}
        </button>
      </div>

      {resultBanner}

      {showHistory && (
        <>
          <h3 className="settings-card__h3-with-icon" style={{ marginTop: 24, marginBottom: 12 }}>
            <FaSync className="icon" aria-hidden />
            <span>Check run history</span>
          </h3>
          <div className="header-bar" style={{ marginBottom: 12 }}>
            <div className="left-buttons">
              <button type="button" className="btn secondary" onClick={() => void historyQuery.refetch()}>
                <FaSync className={`icon ${historyQuery.isFetching ? "icon-spin" : ""}`} aria-hidden /> Refresh log
              </button>
            </div>
          </div>
          <CustomThemeProvider>
            <div className="data-grid-wrap" style={{ backgroundColor: "var(--bg-body)", padding: 10, borderRadius: 8 }}>
              <Grid
                gridId={vpnServerId ? `cert-expiry-history-${vpnServerId}` : "cert-expiry-history-all"}
                rows={historyRows}
                columns={historyColumns}
                loading={historyQuery.isLoading}
                pageSizeOptions={[5, 10, 20, 50]}
                paginationModel={{ page: 0, pageSize }}
                onPaginationModelChange={(m: { page: number; pageSize: number }) => setPageSize(m.pageSize)}
                disableRowSelectionOnClick
                slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
                localeText={{ noRowsLabel: "No manual checks logged yet." }}
              />
            </div>
          </CustomThemeProvider>
        </>
      )}

      {(detailRun || detailLoading) && (
        <CertExpiryRunDetailModal run={detailRun} loading={detailLoading} onClose={() => setDetailRun(null)} />
      )}
    </div>
  );
}

function CertExpiryRunDetailModal({
  run,
  loading,
  onClose,
}: {
  run: CertExpiryCheckRunResponse | null;
  loading: boolean;
  onClose: () => void;
}) {
  const profileColumns: GridColDef[] = [
    { field: "issuedOvpnFileId", headerName: "Profile ID", width: 100 },
    { field: "commonName", headerName: "Common name", flex: 0.35, minWidth: 160 },
    {
      field: "outcome",
      headerName: "Outcome",
      width: 130,
      valueFormatter: (value) => certExpiryProfileOutcomeLabel(value),
    },
    {
      field: "expiryUtc",
      headerName: "Expiry",
      width: 170,
      valueFormatter: (value) => (value ? formatDateWithOffset(new Date(String(value))) : "—"),
    },
    { field: "daysLeft", headerName: "Days left", width: 90 },
    { field: "serialNumber", headerName: "Serial", flex: 0.2, minWidth: 120 },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 960, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Certificate expiry check — {run?.scopeLabel ?? "…"}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div style={{ padding: "0 20px 16px" }}>
          {loading || !run ? (
            <p>Loading run details…</p>
          ) : (
            <>
              <p className="settings-item-description">
                Started {run.startedAtUtc ? formatDateWithOffset(new Date(run.startedAtUtc)) : "—"}
                {run.finishedAtUtc ? ` · finished ${formatDateWithOffset(new Date(run.finishedAtUtc))}` : ""}
                {run.durationMs != null ? ` · ${run.durationMs} ms` : ""}
                {" · "}
                {certExpiryRunStatusLabel(run.status)}
                {run.errorMessage ? ` — ${run.errorMessage}` : ""}
              </p>
              <p className="settings-item-description">
                Warning window: {run.warningDays} day(s)
                {run.sendNotifications ? " · notifications sent" : " · report only"}
                {run.isScheduled ? " · scheduled run" : " · manual run"}
              </p>

              {(run.servers ?? []).map((server: CertExpiryDtoCertExpiryServerResultDto) => (
                <div key={server.vpnServerId} style={{ marginBottom: 20 }}>
                  <h4 style={{ marginBottom: 8 }}>
                    {server.serverName} (#{server.vpnServerId})
                    {" — "}
                    {server.fetchStatus === EnumsCertExpiryServerFetchStatus.NUMBER_0 ? "OK" : "Failed"}
                    {server.durationMs != null ? ` · ${server.durationMs} ms` : ""}
                    {server.fetchError ? `: ${server.fetchError}` : ""}
                  </h4>
                  {(server.profiles?.length ?? 0) > 0 ? (
                    <CustomThemeProvider>
                      <div
                        className="data-grid-wrap"
                        style={{ backgroundColor: "var(--bg-body)", padding: 10, borderRadius: 8 }}
                      >
                        <Grid
                          gridId={`cert-expiry-run-${run.runId}-server-${server.vpnServerId}`}
                          rows={(server.profiles ?? []).map((p: CertExpiryDtoCertExpiryProfileResultDto, idx: number) => ({
                            ...p,
                            id: `${p.issuedOvpnFileId}-${idx}`,
                          }))}
                          columns={profileColumns}
                          pageSizeOptions={[5, 10, 20, 50]}
                          disableRowSelectionOnClick
                          autoHeight
                          hideFooter={(server.profiles?.length ?? 0) <= 10}
                          localeText={{ noRowsLabel: "No profiles checked on this server." }}
                        />
                      </div>
                    </CustomThemeProvider>
                  ) : (
                    <p className="settings-item-description">No profiles evaluated on this server.</p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
        <div className="modal-actions" style={{ padding: "0 20px 20px" }}>
          <button type="button" className="btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default CertExpiryCheckPanel;
