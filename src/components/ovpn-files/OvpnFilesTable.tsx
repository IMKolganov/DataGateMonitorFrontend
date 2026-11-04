import React, { useState, useCallback, useMemo, useEffect } from "react";
import type { GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import Grid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import type {
  IssuedOvpnFileDto,
  RevokeFileRequest,
  DownloadFileRequest,
  DownloadFileResponse,
  DownloadFileResponseApiResponse,
} from "../../api/orvalModelShim";
import { usePostApiOpenVpnFilesRevokeFile, usePostApiOpenVpnFilesDownloadFile } from "../../api/orval/open-vpn-files/open-vpn-files.ts";
import { FaBan, FaDownload } from "react-icons/fa";
import Chip from "@mui/material/Chip";
import type { IssuedOvpnFileOrigin } from "../../api/localIssuance";
import { toast } from "react-toastify";
import { formatDateWithOffset } from "../../utils/utils.ts";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { useClientGridPagination } from "../../hooks/useClientGridPagination";
import { GridRowActions, RowActionButton } from "../ui/GridRowActions.tsx";
import {
  collectSelectedOnPage,
  emptyGridSelection,
  slicePageRows,
} from "../../utils/gridPageSelection";
import "../../css/Table.css";

const safeFormatDate = (input?: string | null): string => {
  if (!input) return "";
  const date = new Date(input);
  return isNaN(date.getTime()) ? "Invalid date" : formatDateWithOffset(date);
};

export type OvpnRowInput =
  | { issuedOvpnFile?: IssuedOvpnFileDto }
  | Record<string, unknown>
  | IssuedOvpnFileDto;

interface Props {
  ovpnFiles: OvpnRowInput[];
  vpnServerId: string;
  onRevoke: (count?: number) => Promise<void> | void;
  loading: boolean;
  /** Origin / service-profile extras by IssuedOvpnFile id (node-local issuance). */
  origins?: Map<number, IssuedOvpnFileOrigin>;
}

type OvpnRow = {
  id: string;
  numericId: number | null;
  externalId: string;
  commonName: string;
  fileName: string;
  filePath: string;
  issuedAt: string;
  issuedTo: string;
  certFilePath: string;
  keyFilePath: string;
  isRevoked: boolean | undefined;
  message: string;
  lastUpdate: string;
  createDate: string;
  isLocal: boolean;
  isServiceProfile: boolean;
};

function unwrapOvpnItem(x: OvpnRowInput): IssuedOvpnFileDto | null {
  if (!x) return null;
  if ((x as IssuedOvpnFileDto).commonName != null || (x as IssuedOvpnFileDto).id != null) {
    return x as IssuedOvpnFileDto;
  }
  const rec = x as Record<string, unknown>;
  const candidates = [
    "issuedOvpnFile",
    "issuedOvpnFileDto",
    "ovpnFile",
    "file",
    "item",
    "value",
    "data",
  ];
  for (const k of candidates) {
    const v = rec[k];
    if (v && typeof v === "object" && v !== null) {
      const o = v as IssuedOvpnFileDto;
      if (o.commonName != null || o.id != null) return o;
    }
  }
  const payload = rec["payload"];
  if (payload && typeof payload === "object" && payload !== null) {
    const nested = (payload as Record<string, unknown>)["issuedOvpnFile"];
    if (nested && typeof nested === "object") return nested as IssuedOvpnFileDto;
  }
  return null;
}

function revokeErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e.response?.data?.message || e.message || "Error revoking OVPN file.";
}

export function OvpnOriginLabels({ isLocal, isServiceProfile }: { isLocal: boolean; isServiceProfile: boolean }) {
  if (!isLocal && !isServiceProfile) return <span style={{ color: "var(--text-muted)" }}>Dashboard</span>;
  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {isLocal && (
        <Chip
          size="small"
          color="info"
          variant="outlined"
          label="Issued locally"
          title="Issued on the node itself (datagate-profile), not from the dashboard"
        />
      )}
      {isServiceProfile && (
        <Chip
          size="small"
          color="secondary"
          variant="outlined"
          label="Service"
          title="Service profile: only VPN-internal traffic goes through the tunnel"
        />
      )}
    </span>
  );
}

const OvpnFilesTable: React.FC<Props> = ({ ovpnFiles, vpnServerId, onRevoke, loading, origins }) => {
  const { mutateAsync: revokeMutate, isPending: revokePending } = usePostApiOpenVpnFilesRevokeFile();
  const { mutateAsync: downloadMutate, isPending: downloadPending } = usePostApiOpenVpnFilesDownloadFile();

  const [searchQuery, setSearchQuery] = useState("");
  const [issuedToFilter, setIssuedToFilter] = useState("");
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const bulkRevoking = bulkProgress !== null;
  const canRevokeAll = isAdmin(getCurrentUser());
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>(emptyGridSelection);
  const paging = useClientGridPagination({
    storageKey: `ovpn-files:${vpnServerId}`,
    defaultPageSize: 10,
    allowedKey: "5,10,20,100",
  });
  const ovpnFilesGridPage = paging.page;
  const ovpnFilesPageSize = paging.pageSize;

  const items: IssuedOvpnFileDto[] = useMemo(() => {
    const arr = Array.isArray(ovpnFiles) ? ovpnFiles : [];
    return arr
      .map(unwrapOvpnItem)
      .filter((x): x is IssuedOvpnFileDto => !!x && (x.id != null || x.commonName != null));
  }, [ovpnFiles]);

  useEffect(() => {
    setRowSelectionModel(emptyGridSelection());
  }, [searchQuery, issuedToFilter, ovpnFilesGridPage, ovpnFilesPageSize, vpnServerId]);

  const allRows: OvpnRow[] = useMemo(
    () =>
      items.map((issuedOvpnFile, index) => {
        const origin = issuedOvpnFile.id != null ? origins?.get(Number(issuedOvpnFile.id)) : undefined;
        const id =
          issuedOvpnFile.id != null
            ? String(issuedOvpnFile.id)
            : `${issuedOvpnFile.commonName ?? "cn"}-${index}`;

        return {
          id,
          numericId: issuedOvpnFile.id != null ? Number(issuedOvpnFile.id) : null,
          externalId: issuedOvpnFile.externalId || "",
          commonName: issuedOvpnFile.commonName || "",
          fileName: issuedOvpnFile.fileName || "",
          filePath: issuedOvpnFile.filePath || "",
          issuedAt: safeFormatDate(issuedOvpnFile.issuedAt),
          issuedTo: issuedOvpnFile.issuedTo || "",
          certFilePath: issuedOvpnFile.certFilePath || "",
          keyFilePath: issuedOvpnFile.keyFilePath || "",
          isRevoked: issuedOvpnFile.isRevoked,
          message: issuedOvpnFile.message || "",
          lastUpdate: safeFormatDate(issuedOvpnFile.lastUpdate),
          createDate: safeFormatDate(issuedOvpnFile.createDate),
          isLocal: origin?.origin === "local",
          isServiceProfile: origin?.isServiceProfile === true,
        };
      }),
    [items, origins],
  );

  const rows = useMemo(() => {
    return allRows.filter((x) => {
      const byCN = x.commonName.toLowerCase().includes(searchQuery.toLowerCase());
      const byIssuedTo =
        issuedToFilter === "" || x.issuedTo.toLowerCase().includes(issuedToFilter.toLowerCase());
      return byCN && byIssuedTo;
    });
  }, [allRows, searchQuery, issuedToFilter]);

  const activeRows = useMemo(
    () => allRows.filter((row) => !row.isRevoked && row.numericId != null),
    [allRows],
  );

  const pageRows = useMemo(
    () => slicePageRows(rows, ovpnFilesGridPage, ovpnFilesPageSize),
    [rows, ovpnFilesGridPage, ovpnFilesPageSize],
  );

  const selectedActiveRows = useMemo(
    () =>
      collectSelectedOnPage(
        rowSelectionModel,
        pageRows,
        (row) => !row.isRevoked && row.numericId != null,
      ),
    [rowSelectionModel, pageRows],
  );

  const clearSelection = useCallback(() => setRowSelectionModel(emptyGridSelection()), []);

  const handleRevokeMany = useCallback(
    async (targets: OvpnRow[], confirmMessage?: string) => {
      const unique = targets.filter((r) => r.numericId != null && !r.isRevoked);
      if (unique.length === 0) return;

      const labels = unique.map((r) => r.commonName || r.fileName || String(r.numericId));
      const preview =
        labels.length <= 5
          ? labels.join(", ")
          : `${labels.slice(0, 3).join(", ")} and ${labels.length - 3} more`;
      const confirmed = window.confirm(
        confirmMessage ??
          (unique.length === 1
            ? `Are you sure you want to revoke OVPN file ${labels[0]}?`
            : `Are you sure you want to revoke ${unique.length} OVPN files?\n\n${preview}\n\nThis cannot be undone.`),
      );
      if (!confirmed) return;

      setBulkProgress({ done: 0, total: unique.length });
      try {
        const failures: string[] = [];
        for (const row of unique) {
          try {
            const data: RevokeFileRequest = {
              vpnServerId: Number(vpnServerId),
              ovpnFileId: row.numericId!,
              commonName: row.commonName,
            };
            await revokeMutate({ data });
          } catch (err: unknown) {
            failures.push(`${row.commonName || row.id}: ${revokeErrorMessage(err)}`);
          }
          setBulkProgress((p) => p && { ...p, done: p.done + 1 });
        }

        const succeeded = unique.length - failures.length;
        clearSelection();

        if (succeeded > 0) {
          await onRevoke(succeeded);
        }
        if (failures.length > 0) {
          toast.error(
            failures.length === 1
              ? failures[0]
              : `Failed to revoke ${failures.length} of ${unique.length} OVPN files.`,
          );
        }
      } finally {
        setBulkProgress(null);
      }
    },
    [vpnServerId, revokeMutate, onRevoke, clearSelection],
  );

  const handleRevoke = useCallback(
    async (row: OvpnRow) => {
      await handleRevokeMany([row]);
    },
    [handleRevokeMany],
  );

  const handleBulkRevoke = useCallback(async () => {
    await handleRevokeMany(selectedActiveRows);
  }, [handleRevokeMany, selectedActiveRows]);

  // Uses allRows on purpose: search filters and paging must not leave anything active.
  const handleRevokeAll = useCallback(async () => {
    await handleRevokeMany(
      activeRows,
      `Revoke ALL ${activeRows.length} active OVPN files on this server?\n\n` +
        "Every client, including profiles issued locally on the node, loses access until a new file is issued. " +
        "Search filters are ignored.\n\n" +
        "If the server IP changed, update it in the server settings first so new files use the new address.\n\n" +
        "This cannot be undone.",
    );
  }, [handleRevokeMany, activeRows]);

  const handleDownload = useCallback(
    async (issuedOvpnFileId: number) => {
      try {
        const payload: DownloadFileRequest = {
          vpnServerId: Number(vpnServerId),
          issuedOvpnFileId,
        };

        const apiResult = (await downloadMutate({ data: payload })) as
          | DownloadFileResponseApiResponse
          | DownloadFileResponse;

        const resp: DownloadFileResponse | undefined =
          (apiResult as DownloadFileResponseApiResponse)?.data ?? (apiResult as DownloadFileResponse);

        const b64 = resp?.content ?? null;
        if (!b64) throw new Error("No file content received.");

        const raw = atob(b64);
        const bytes = new Uint8Array([...raw].map((c) => c.charCodeAt(0)));

        const blob = new Blob([bytes], { type: "application/x-openvpn-profile" });
        const fileName = resp?.issuedOvpn?.fileName ?? `client_${issuedOvpnFileId}.ovpn`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        toast.success("File downloaded.");
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };

        const msg = e.response?.data?.message || e.message || "Error downloading file.";

        toast.error(msg);
      }
    },
    [downloadMutate, vpnServerId],
  );

  const busy = loading || bulkRevoking || revokePending;

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 110 },
    { field: "externalId", headerName: "External ID", flex: 1, minWidth: 120 },
    { field: "commonName", headerName: "Common Name", flex: 1, minWidth: 160 },
    { field: "fileName", headerName: "File Name", flex: 1, minWidth: 160 },
    { field: "issuedAt", headerName: "Issued Date", flex: 0.8, minWidth: 140 },
    {
      field: "isLocal",
      headerName: "Origin",
      flex: 0.8,
      minWidth: 150,
      sortable: false,
      renderCell: (params) => {
        const row = params.row as OvpnRow;
        return <OvpnOriginLabels isLocal={row.isLocal} isServiceProfile={row.isServiceProfile} />;
      },
    },
    {
      field: "isRevoked",
      headerName: "Status",
      flex: 0.6,
      minWidth: 120,
      renderCell: (params) => (params.value ? "❌ Revoked" : "✅ Active"),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const row = params.row as OvpnRow;
        return (
          <GridRowActions>
            {!row.isRevoked && row.numericId != null && (
              <RowActionButton
                variant="danger"
                title="Revoke"
                disabled={busy}
                onClick={() => void handleRevoke(row)}
                icon={<FaBan className="icon" />}
              />
            )}
            {row.numericId != null && (
              <RowActionButton
                title="Download OVPN"
                disabled={downloadPending || bulkRevoking}
                onClick={() => void handleDownload(row.numericId!)}
                icon={<FaDownload className="icon" />}
              />
            )}
          </GridRowActions>
        );
      },
    },
  ];

  return (
    <CustomThemeProvider>
      <div
        className="data-grid-wrap"
        style={{
          backgroundColor: "var(--bg-body)",
          padding: "10px",
          borderRadius: "8px",
        }}
      >
        <div className="filters" style={{ marginBottom: 12 }}>
          <input
            id="ovpn-files-search-common-name"
            name="ovpnFilesSearchCommonName"
            type="text"
            placeholder="Search by Common Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
          <input
            id="ovpn-files-search-issued-to"
            name="ovpnFilesSearchIssuedTo"
            type="text"
            placeholder="Search by Issued To"
            value={issuedToFilter}
            onChange={(e) => setIssuedToFilter(e.target.value)}
            className="input"
          />
          <button
            type="button"
            className="btn danger"
            disabled={busy || selectedActiveRows.length === 0}
            onClick={() => void handleBulkRevoke()}
            title={
              selectedActiveRows.length === 0
                ? "Select active OVPN files to revoke"
                : `Revoke ${selectedActiveRows.length} selected`
            }
          >
            <FaBan className="icon" aria-hidden />
            {bulkRevoking
              ? "Revoking…"
              : selectedActiveRows.length > 0
                ? `Revoke selected (${selectedActiveRows.length})`
                : "Revoke selected"}
          </button>
          {canRevokeAll && (
            <button
              type="button"
              className="btn danger"
              disabled={busy || activeRows.length === 0}
              onClick={() => void handleRevokeAll()}
              title="Revoke every active OVPN file on this server, e.g. after its IP changed"
            >
              <FaBan className="icon" aria-hidden />
              {bulkProgress
                ? `Revoking… ${bulkProgress.done}/${bulkProgress.total}`
                : `Revoke all (${activeRows.length})`}
            </button>
          )}
        </div>

        <Grid
          gridId="ovpn-files"
          getRowId={(row) => row.id}
          rows={rows}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          disableRowSelectionExcludeModel
          isRowSelectable={(params) => !params.row.isRevoked && params.row.numericId != null}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={(model) => setRowSelectionModel(model)}
          {...paging.gridProps}
          localeText={{
            noRowsLabel: loading ? "🔄 Loading OVPN files..." : "📭 No OVPN files found",
          }}
          loading={busy || downloadPending}
          slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default OvpnFilesTable;
