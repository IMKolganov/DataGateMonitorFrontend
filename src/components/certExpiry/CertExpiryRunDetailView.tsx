import { useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import Grid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import type { CertExpiryCheckRunResponse } from "../../api/orvalModelShim";
import type { CertExpiryDtoCertExpiryProfileResultDto } from "../../api/orval/model/certExpiryDtoCertExpiryProfileResultDto";
import type { CertExpiryDtoCertExpiryServerResultDto } from "../../api/orval/model/certExpiryDtoCertExpiryServerResultDto";
import { EnumsCertExpiryServerFetchStatus } from "../../api/orval/model/enumsCertExpiryServerFetchStatus";
import { formatDateWithOffset } from "../../utils/utils.ts";
import {
  certExpiryProfileHasIssue,
  certExpiryProfileOutcomeLabel,
  certExpiryRunStatusLabel,
} from "../../utils/certExpiryLabels.ts";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize.ts";
import "../../css/Settings.css";
import "../../css/Table.css";

const profileColumns: GridColDef[] = [
  { field: "issuedOvpnFileId", headerName: "Profile ID", width: 100 },
  { field: "commonName", headerName: "Common name", flex: 0.35, minWidth: 180 },
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
  { field: "serialNumber", headerName: "Serial", flex: 0.2, minWidth: 140 },
];

function serverFetchFailed(server: CertExpiryDtoCertExpiryServerResultDto): boolean {
  return server.fetchStatus !== EnumsCertExpiryServerFetchStatus.NUMBER_0;
}

function serverHasProfileIssues(server: CertExpiryDtoCertExpiryServerResultDto): boolean {
  return (server.profiles ?? []).some((p) => certExpiryProfileHasIssue(p.outcome));
}

function ServerProfilesGrid({
  runId,
  server,
  issuesOnly,
}: {
  runId: string;
  server: CertExpiryDtoCertExpiryServerResultDto;
  issuesOnly: boolean;
}) {
  const [pageSize, setPageSize] = usePersistedPageSize(
    `cert-expiry-run-${runId}-server-${server.vpnServerId}${issuesOnly ? ":issues" : ":all"}`,
    20,
    "10,20,50,100",
  );

  const allRows = useMemo(
    () =>
      (server.profiles ?? []).map((p: CertExpiryDtoCertExpiryProfileResultDto, idx: number) => ({
        ...p,
        id: `${p.issuedOvpnFileId}-${idx}`,
      })),
    [server.profiles],
  );

  const rows = useMemo(
    () => (issuesOnly ? allRows.filter((p) => certExpiryProfileHasIssue(p.outcome)) : allRows),
    [allRows, issuesOnly],
  );

  if (allRows.length === 0) {
    return <p className="settings-item-description">No profiles evaluated on this server.</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="settings-item-description">
        No profile issues on this server ({allRows.length} healthy profile{allRows.length === 1 ? "" : "s"}).
      </p>
    );
  }

  return (
    <CustomThemeProvider>
      <div className="data-grid-wrap" style={{ backgroundColor: "var(--bg-body)", padding: 10, borderRadius: 8 }}>
        <Grid
          gridId={`cert-expiry-run-${runId}-server-${server.vpnServerId}${issuesOnly ? "-issues" : "-all"}`}
          rows={rows}
          columns={profileColumns}
          loading={false}
          pageSizeOptions={[10, 20, 50, 100]}
          paginationModel={{ page: 0, pageSize }}
          onPaginationModelChange={(m: { page: number; pageSize: number }) => setPageSize(m.pageSize)}
          disableRowSelectionOnClick
          slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
          localeText={{ noRowsLabel: "No profiles on this server." }}
        />
      </div>
    </CustomThemeProvider>
  );
}

function sortServers(servers: CertExpiryDtoCertExpiryServerResultDto[]): CertExpiryDtoCertExpiryServerResultDto[] {
  return [...servers].sort((a, b) => {
    const aFailed = serverFetchFailed(a) ? 0 : 1;
    const bFailed = serverFetchFailed(b) ? 0 : 1;
    if (aFailed !== bFailed) return aFailed - bFailed;

    const aIssues = serverHasProfileIssues(a) ? 0 : 1;
    const bIssues = serverHasProfileIssues(b) ? 0 : 1;
    if (aIssues !== bIssues) return aIssues - bIssues;

    return (a.serverName ?? "").localeCompare(b.serverName ?? "");
  });
}

export function CertExpiryRunDetailView({ run }: { run: CertExpiryCheckRunResponse }) {
  const summary = run.summary;
  const [issuesOnly, setIssuesOnly] = useState(true);

  const servers = useMemo(() => sortServers(run.servers ?? []), [run.servers]);

  const visibleServers = useMemo(() => {
    if (!issuesOnly) return servers;
    return servers.filter((s) => serverFetchFailed(s) || serverHasProfileIssues(s));
  }, [issuesOnly, servers]);

  const hiddenCleanServers = issuesOnly ? servers.length - visibleServers.length : 0;

  return (
    <div className="settings-group">
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

      {summary ? (
        <div className="settings-item" style={{ flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
          <span>Servers: {summary.serversChecked ?? 0}</span>
          <span>Profiles: {summary.profilesChecked ?? 0}</span>
          <span>Healthy: {summary.healthy ?? 0}</span>
          <span>Expired: {summary.expired ?? 0}</span>
          <span>Expiring: {summary.expiringSoon ?? 0}</span>
          <span>Missing: {summary.missingOnNode ?? 0}</span>
          <span>Server errors: {summary.serverFailures ?? 0}</span>
        </div>
      ) : null}

      <div className="settings-item" style={{ alignItems: "center", marginBottom: 16 }}>
        <label className="settings-item-description" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <input type="checkbox" checked={issuesOnly} onChange={(e) => setIssuesOnly(e.target.checked)} />
          Show only servers and profiles with issues
        </label>
      </div>

      {issuesOnly && hiddenCleanServers > 0 ? (
        <p className="settings-item-description" style={{ marginBottom: 16 }}>
          {hiddenCleanServers} server{hiddenCleanServers === 1 ? "" : "s"} with no issues hidden. Uncheck the filter
          above to list all {summary?.healthy ?? 0} healthy profiles.
        </p>
      ) : null}

      {visibleServers.length === 0 ? (
        <p className="message-success">No profile or server issues in this run.</p>
      ) : null}

      {visibleServers.map((server: CertExpiryDtoCertExpiryServerResultDto) => (
        <section
          key={server.vpnServerId}
          className="certificates-page__section server-details__panel"
          style={{ marginBottom: 24 }}
        >
          <h3 className="settings-card__h3-with-icon" style={{ marginBottom: 12 }}>
            <span>
              {server.serverName} (#{server.vpnServerId})
              {" — "}
              {serverFetchFailed(server) ? "Failed" : "OK"}
              {server.durationMs != null ? ` · ${server.durationMs} ms` : ""}
              {server.fetchError ? `: ${server.fetchError}` : ""}
            </span>
          </h3>
          <ServerProfilesGrid runId={run.runId ?? "unknown"} server={server} issuesOnly={issuesOnly} />
        </section>
      ))}
    </div>
  );
}

export default CertExpiryRunDetailView;
