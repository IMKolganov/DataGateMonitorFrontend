import { useEffect, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { FaEye, FaPlay, FaSync } from "react-icons/fa";
import { toast } from "react-toastify";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import Grid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import {
  getGetApiV2CertExpiryRunsQueryKey,
  useGetApiV2CertExpiryRuns,
} from "../../api/orval/cert-expiry-v2/cert-expiry-v2.ts";
import { usePostApiCertExpiryCheck } from "../../api/orval/cert-expiry/cert-expiry.ts";
import type {
  CertExpiryCheckRunResponse,
  CertExpiryRunSummaryDto,
} from "../../api/orvalModelShim";
import type { CertExpiryResponsesGetCertExpiryRunsV2Response } from "../../api/orval/model/certExpiryResponsesGetCertExpiryRunsV2Response";
import { formatDateWithOffset } from "../../utils/utils.ts";
import { errorMessage } from "../../utils/errorMessage.ts";
import {
  certExpiryRunHasIssues,
  certExpiryRunStatusLabel,
} from "../../utils/certExpiryLabels.ts";
import { certExpiryRunDetailPath } from "../../utils/certExpiryRoutes.ts";
import { useServerGridPagination } from "../../hooks/useServerGridPagination.ts";
import "../../css/Settings.css";
import "../../css/Table.css";

/** ogmMutator unwraps ApiResponse.data at runtime; Orval types still use the Api* wrapper. */
function unwrapCertExpiryRun(raw: unknown): CertExpiryCheckRunResponse {
  return raw as CertExpiryCheckRunResponse;
}

function unwrapCertExpiryRunsV2(raw: unknown): CertExpiryResponsesGetCertExpiryRunsV2Response {
  return (raw ?? {}) as CertExpiryResponsesGetCertExpiryRunsV2Response;
}

type Props = {
  vpnServerId?: number;
  serverName?: string;
  showHistory?: boolean;
  /** @deprecated v2 uses Page/PageSize; kept for call-site compatibility */
  historyLimit?: number;
};

export function CertExpiryCheckPanel({
  vpnServerId,
  serverName,
  showHistory = true,
}: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [sendNotifications, setSendNotifications] = useState(false);
  const [lastResult, setLastResult] = useState<CertExpiryCheckRunResponse | null>(null);
  const [rowCount, setRowCount] = useState(0);

  const returnTo = location.pathname + location.search;
  const resetKey = vpnServerId ?? "all";

  const paging = useServerGridPagination({
    storageKey: vpnServerId ? `cert-expiry-history:${vpnServerId}` : "cert-expiry-history:all",
    defaultPageSize: 10,
    allowedKey: "5,10,20,50",
    rowCount,
    resetKey,
  });

  const historyParams = useMemo(
    () => ({
      Page: paging.apiPage,
      PageSize: paging.pageSize,
      VpnServerId: vpnServerId ?? undefined,
    }),
    [paging.apiPage, paging.pageSize, vpnServerId],
  );

  const historyQuery = useGetApiV2CertExpiryRuns(historyParams, {
    query: { enabled: showHistory, staleTime: 5_000 },
  });

  const runsPage = unwrapCertExpiryRunsV2(historyQuery.data).runs;

  useEffect(() => {
    if (typeof runsPage?.totalCount === "number") {
      setRowCount(runsPage.totalCount);
    }
  }, [runsPage?.totalCount]);

  const checkMutation = usePostApiCertExpiryCheck({
    mutation: {
      onSuccess: (result) => {
        const run = unwrapCertExpiryRun(result);
        setLastResult(run);
        void queryClient.invalidateQueries({ queryKey: getGetApiV2CertExpiryRunsQueryKey(historyParams) });
        if (certExpiryRunHasIssues(run)) {
          toast.warn("Certificate expiry check finished with findings.");
        } else {
          toast.success("Certificate expiry check completed successfully.");
        }
      },
      onError: (err) => toast.error(errorMessage(err)),
    },
  });

  const runCheck = () => {
    checkMutation.mutate({
      data: {
        vpnServerId: vpnServerId ?? undefined,
        sendNotifications,
      },
    });
  };

  const openRunDetails = (runId: string) => {
    navigate(certExpiryRunDetailPath(runId), { state: { returnTo } });
  };

  const historyRows = useMemo(() => {
    return (runsPage?.items ?? []).map((r: CertExpiryRunSummaryDto, idx: number) => ({
      ...r,
      id: r.runId ?? `run-${idx}`,
    }));
  }, [runsPage?.items]);

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
          onClick={() => openRunDetails(String(params.row.runId))}
        >
          <FaEye className="icon" aria-hidden />
        </button>
      ),
    },
  ];

  const resultBanner = lastResult?.runId ? (
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
      <Link
        to={certExpiryRunDetailPath(lastResult.runId)}
        state={{ returnTo }}
        className="btn secondary"
        style={{ marginLeft: 8 }}
      >
        View details
      </Link>
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
                {...paging.gridProps}
                disableRowSelectionOnClick
                slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
                localeText={{ noRowsLabel: "No checks logged yet." }}
              />
            </div>
          </CustomThemeProvider>
        </>
      )}
    </div>
  );
}

export default CertExpiryCheckPanel;
