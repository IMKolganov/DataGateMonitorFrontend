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
import {
  postApiXrayClientLinksDownloadFile,
  postApiXrayClientLinksRevokeFile,
} from "../../api/xrayClientLinks.ts";
import { FaBan, FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import { formatDateWithOffset } from "../../utils/utils.ts";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize";
import type { OvpnRowInput } from "../ovpn-files/OvpnFilesTable.tsx";
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

function unwrapLinkRow(x: OvpnRowInput): IssuedOvpnFileDto | null {
  if (!x) return null;
  if ((x as IssuedOvpnFileDto).commonName != null || (x as IssuedOvpnFileDto).id != null) {
    return x as IssuedOvpnFileDto;
  }
  const rec = x as Record<string, unknown>;
  for (const k of ["issuedOvpnFile", "issuedOvpnFileDto", "ovpnFile", "file", "item", "value", "data"]) {
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
  return e.response?.data?.message || e.message || "Error revoking client link.";
}

interface Props {
  links: OvpnRowInput[];
  vpnServerId: string;
  onRevoke: (count?: number) => Promise<void> | void;
  loading: boolean;
}

type LinkRow = {
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
};

const XrayClientLinksTable: React.FC<Props> = ({ links, vpnServerId, onRevoke, loading }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [issuedToFilter, setIssuedToFilter] = useState("");
  const [bulkRevoking, setBulkRevoking] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>(emptyGridSelection);
  const [gridPage, setGridPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize(`xray-client-links:${vpnServerId}`, 10, "5,10,20,100");

  const items: IssuedOvpnFileDto[] = useMemo(() => {
    const arr = Array.isArray(links) ? links : [];
    return arr
      .map(unwrapLinkRow)
      .filter((x): x is IssuedOvpnFileDto => !!x && (x.id != null || x.commonName != null));
  }, [links]);

  const filtered = useMemo(() => {
    return items.filter((x) => {
      const byCN = (x.commonName ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      const byIssuedTo =
        issuedToFilter === "" || (x.issuedTo ?? "").toLowerCase().includes(issuedToFilter.toLowerCase());
      return byCN && byIssuedTo;
    });
  }, [items, searchQuery, issuedToFilter]);

  useEffect(() => {
    setRowSelectionModel(emptyGridSelection());
  }, [searchQuery, issuedToFilter, gridPage, pageSize, vpnServerId]);

  const rows: LinkRow[] = useMemo(
    () =>
      filtered.map((row, index) => {
        const id = row.id != null ? String(row.id) : `${row.commonName ?? "cn"}-${index}`;
        return {
          id,
          numericId: row.id != null ? Number(row.id) : null,
          externalId: row.externalId || "",
          commonName: row.commonName || "",
          fileName: row.fileName || "",
          filePath: row.filePath || "",
          issuedAt: safeFormatDate(row.issuedAt),
          issuedTo: row.issuedTo || "",
          certFilePath: row.certFilePath || "",
          keyFilePath: row.keyFilePath || "",
          isRevoked: row.isRevoked,
          message: row.message || "",
          lastUpdate: safeFormatDate(row.lastUpdate),
          createDate: safeFormatDate(row.createDate),
        };
      }),
    [filtered],
  );

  const pageRows = useMemo(() => slicePageRows(rows, gridPage, pageSize), [rows, gridPage, pageSize]);

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
    async (targets: LinkRow[]) => {
      const unique = targets.filter((r) => r.numericId != null && !r.isRevoked);
      if (unique.length === 0) return;

      const labels = unique.map((r) => r.commonName || r.fileName || String(r.numericId));
      const preview =
        labels.length <= 5
          ? labels.join(", ")
          : `${labels.slice(0, 3).join(", ")} and ${labels.length - 3} more`;
      const confirmed = window.confirm(
        unique.length === 1
          ? `Revoke VLESS client link for ${labels[0]}?`
          : `Revoke ${unique.length} VLESS client links?\n\n${preview}\n\nThis cannot be undone.`,
      );
      if (!confirmed) return;

      setBulkRevoking(true);
      try {
        const failures: string[] = [];
        for (const row of unique) {
          try {
            const data: RevokeFileRequest = {
              vpnServerId: Number(vpnServerId),
              ovpnFileId: row.numericId!,
              commonName: row.commonName,
            };
            await postApiXrayClientLinksRevokeFile(data);
          } catch (err: unknown) {
            failures.push(`${row.commonName || row.id}: ${revokeErrorMessage(err)}`);
          }
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
              : `Failed to revoke ${failures.length} of ${unique.length} client links.`,
          );
        }
      } finally {
        setBulkRevoking(false);
      }
    },
    [vpnServerId, onRevoke, clearSelection],
  );

  const handleRevoke = useCallback(
    async (row: LinkRow) => {
      await handleRevokeMany([row]);
    },
    [handleRevokeMany],
  );

  const handleBulkRevoke = useCallback(async () => {
    await handleRevokeMany(selectedActiveRows);
  }, [handleRevokeMany, selectedActiveRows]);

  const handleDownload = useCallback(
    async (issuedFileId: number) => {
      try {
        const payload: DownloadFileRequest = {
          vpnServerId: Number(vpnServerId),
          issuedOvpnFileId: issuedFileId,
        };
        const apiResult = (await postApiXrayClientLinksDownloadFile(payload)) as
          | DownloadFileResponseApiResponse
          | DownloadFileResponse;

        const resp: DownloadFileResponse | undefined =
          (apiResult as DownloadFileResponseApiResponse)?.data ?? (apiResult as DownloadFileResponse);

        const b64 = resp?.content ?? null;
        if (!b64) throw new Error("No file content received.");

        const raw = atob(b64);
        const bytes = new Uint8Array([...raw].map((c) => c.charCodeAt(0)));

        const fileName = resp?.issuedOvpn?.fileName ?? `client_${issuedFileId}.txt`;
        const mime = /\.(txt|json)$/i.test(fileName)
          ? "text/plain;charset=utf-8"
          : "application/octet-stream";
        const blob = new Blob([bytes], { type: mime });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        toast.success("Downloaded.");
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        toast.error(e.response?.data?.message || e.message || "Error downloading file.");
      }
    },
    [vpnServerId],
  );

  const busy = loading || bulkRevoking;

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 110 },
    { field: "externalId", headerName: "External ID", flex: 1, minWidth: 120 },
    { field: "commonName", headerName: "Common Name", flex: 1, minWidth: 160 },
    { field: "fileName", headerName: "File Name", flex: 1, minWidth: 160 },
    { field: "issuedAt", headerName: "Issued", flex: 0.8, minWidth: 140 },
    {
      field: "isRevoked",
      headerName: "Status",
      flex: 0.6,
      minWidth: 120,
      renderCell: (params) => (params.value ? "Revoked" : "Active"),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const row = params.row as LinkRow;
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
                title="Download client link file"
                disabled={bulkRevoking}
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
            id="xray-links-search-common-name"
            name="xrayLinksSearchCommonName"
            type="text"
            placeholder="Search by Common Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
          <input
            id="xray-links-search-issued-to"
            name="xrayLinksSearchIssuedTo"
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
                ? "Select active VLESS links to revoke"
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
        </div>

        <Grid
          gridId="xray-client-links"
          getRowId={(row) => row.id}
          rows={rows}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          disableRowSelectionExcludeModel
          isRowSelectable={(params) => !params.row.isRevoked && params.row.numericId != null}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={(model) => setRowSelectionModel(model)}
          pageSizeOptions={[5, 10, 20, 100]}
          paginationMode="client"
          paginationModel={{ page: gridPage, pageSize }}
          onPaginationModelChange={(m) => {
            setGridPage(m.page);
            setPageSize(m.pageSize);
          }}
          localeText={{
            noRowsLabel: loading ? "Loading client links…" : "No client links yet",
          }}
          loading={busy}
          slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default XrayClientLinksTable;
