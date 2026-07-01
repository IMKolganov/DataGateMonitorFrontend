import { useEffect, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { FaBolt, FaSync } from "react-icons/fa";
import { keepPreviousData } from "@tanstack/react-query";
import Grid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import { useGetApiOpenVpnEventsGetByServer } from "../../api/orval/vpn-server-event/vpn-server-event";
import { useGetApiOpenVpnFilesGetAllVpnServerIdExternalId } from "../../api/orval/open-vpn-files/open-vpn-files";
import type { IssuedOvpnFileDto, OvpnFilesResponse, VpnServerEventLogDto } from "../../api/orvalModelShim";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { formatDateWithOffset } from "../../utils/utils";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize";
import { normalizeOpenVpnEventsPage } from "../../utils/openVpnEvents/normalizeOpenVpnEventsPage";
import { shortOpenVpnCn } from "../../utils/openVpn/shortOpenVpnCn";
import "../../css/ServerForm.css";
import "../../css/Settings.css";
import "../../css/Table.css";

export type UserOpenVpnEventsSectionProps = {
  externalId: string | null | undefined;
  vpnServerId: number;
  selectedCn?: string | null;
  onSelectedCnChange?: (cn: string | null) => void;
};

const safeFormatDate = (value: unknown) => {
  if (!value || (typeof value !== "string" && typeof value !== "number")) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : formatDateWithOffset(date);
};

const formatBytes = (n?: number | null) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
};

const formatDuration = (s?: number | null) => {
  if (s === null || s === undefined || !Number.isFinite(s)) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const pad = (x: number) => x.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

export function UserOpenVpnEventsSection({
  externalId,
  vpnServerId,
  selectedCn: selectedCnProp,
  onSelectedCnChange,
}: UserOpenVpnEventsSectionProps) {
  const admin = isAdmin(getCurrentUser());
  const ext = typeof externalId === "string" ? externalId.trim() : "";
  const enabled = admin && ext.length > 0 && vpnServerId > 0;

  const [internalCn, setInternalCn] = useState<string | null>(null);
  const selectedCn = selectedCnProp !== undefined ? selectedCnProp : internalCn;
  const setSelectedCn = onSelectedCnChange ?? setInternalCn;

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize("user-openvpn-events", 10, "5,10,20,50");

  const profilesQuery = useGetApiOpenVpnFilesGetAllVpnServerIdExternalId(vpnServerId, ext, {
    query: { enabled },
  });

  const profileRows = useMemo(() => {
    const files =
      (profilesQuery.data as OvpnFilesResponse | undefined)?.issuedOvpnFiles ??
      [];
    const byCn = new Map<string, IssuedOvpnFileDto>();
    for (const f of files) {
      const cn = f.commonName?.trim();
      if (!cn) continue;
      if (!byCn.has(cn)) byCn.set(cn, f);
    }
    return [...byCn.entries()].map(([commonName, file]) => ({
      commonName,
      isRevoked: Boolean(file.isRevoked),
    }));
  }, [profilesQuery.data]);

  useEffect(() => {
    setPage(0);
  }, [selectedCn, ext, vpnServerId]);

  const cn = selectedCn?.trim() ?? "";

  const params = useMemo(
    () => ({
      VpnServerId: vpnServerId,
      ExternalId: cn ? undefined : ext,
      CommonName: cn || undefined,
      Page: page + 1,
      PageSize: pageSize,
    }),
    [vpnServerId, ext, cn, page, pageSize],
  );

  const query = useGetApiOpenVpnEventsGetByServer(params, {
    query: { enabled, placeholderData: keepPreviousData },
  });

  const normalized = useMemo(() => normalizeOpenVpnEventsPage(query.data), [query.data]);

  const rows = useMemo(
    () =>
      normalized.items.map((e: VpnServerEventLogDto, idx) => ({
        id: Number(e.id ?? idx + 1),
        eventType: String(e.eventType ?? ""),
        commonName: e.commonName ?? "",
        realAddress: e.realAddress ?? "",
        virtualAddress: e.virtualAddress ?? "",
        eventTimeUtc: safeFormatDate(e.eventTimeUtc),
        disconnectedAt: safeFormatDate(e.disconnectedAt),
        duration: formatDuration(typeof e.durationSec === "number" ? e.durationSec : undefined),
        bytesSent: formatBytes(typeof e.bytesSent === "number" ? e.bytesSent : undefined),
        bytesReceived: formatBytes(typeof e.bytesReceived === "number" ? e.bytesReceived : undefined),
      })),
    [normalized.items],
  );

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: "eventType", headerName: "Type", flex: 0.8, minWidth: 100 },
      { field: "commonName", headerName: "CN", flex: 1, minWidth: 120 },
      { field: "realAddress", headerName: "Real address", flex: 0.9, minWidth: 120 },
      { field: "eventTimeUtc", headerName: "Event (UTC)", flex: 1, minWidth: 150 },
      { field: "disconnectedAt", headerName: "Disconnected", flex: 1, minWidth: 150 },
      { field: "duration", headerName: "Duration", width: 100 },
      { field: "bytesSent", headerName: "Sent", width: 90 },
      { field: "bytesReceived", headerName: "Received", width: 90 },
    ],
    [],
  );

  if (!enabled) {
    return null;
  }

  return (
    <section className="settings-card settings-card--mb">
      <div className="settings-card__header">
        <h3 className="settings-card__h3-with-icon" style={{ marginBottom: 0 }}>
          <FaBolt className="icon" aria-hidden />
          OpenVPN events
        </h3>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            void profilesQuery.refetch();
            void query.refetch();
          }}
          disabled={query.isFetching || profilesQuery.isFetching}
        >
          <FaSync className={`icon ${query.isFetching || profilesQuery.isFetching ? "icon-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {profileRows.length === 0 ? (
        <p className="server-details__intro" style={{ marginTop: 0 }}>
          No issued OpenVPN profiles for this user on server {vpnServerId}.
        </p>
      ) : (
        <>
          <div className="server-form" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label>OpenVPN profile (CN)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  className={`btn ${cn ? "secondary" : "primary"}`}
                  onClick={() => setSelectedCn(null)}
                >
                  All profiles ({profileRows.length})
                </button>
                {profileRows.map((profile) => {
                  const name = profile.commonName;
                  const active = cn === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      className={`btn ${active ? "primary" : "secondary"}`}
                      title={name}
                      onClick={() => setSelectedCn(name)}
                    >
                      {shortOpenVpnCn(name)}
                      {profile.isRevoked ? " · revoked" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <CustomThemeProvider>
            <div
              className="data-grid-wrap"
              style={{ backgroundColor: "var(--bg-body)", padding: 10, borderRadius: 8 }}
            >
              <Grid
                gridId="user-openvpn-events"
                rows={rows}
                columns={columns}
                getRowId={(r) => r.id}
                loading={query.isLoading || query.isFetching}
                rowCount={normalized.totalCount}
                paginationMode="server"
                paginationModel={{ page, pageSize }}
                onPaginationModelChange={(m) => {
                  setPage(m.page);
                  setPageSize(m.pageSize);
                }}
                pageSizeOptions={[5, 10, 20, 50]}
                disableRowSelectionOnClick
                slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
                localeText={{
                  noRowsLabel: cn
                    ? `No connect/disconnect events for CN ${shortOpenVpnCn(cn)}`
                    : "No OpenVPN events for this user on this server",
                }}
              />
            </div>
          </CustomThemeProvider>
        </>
      )}
    </section>
  );
}
