import React, { useState, useCallback, useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../ui/TableStyle.tsx";
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
import { FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import { formatDateWithOffset } from "../../utils/utils.ts";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize";
import type { OvpnRowInput } from "../ovpn-files/OvpnFilesTable.tsx";
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

interface Props {
  links: OvpnRowInput[];
  vpnServerId: string;
  onRevoke: () => Promise<void> | void;
  loading: boolean;
}

const XrayClientLinksTable: React.FC<Props> = ({ links, vpnServerId, onRevoke, loading }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [issuedToFilter, setIssuedToFilter] = useState("");
  const [gridPage, setGridPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize(`xray-client-links:${vpnServerId}`, 10, "5,10,20,100");

  const items: IssuedOvpnFileDto[] = useMemo(() => {
    const arr = Array.isArray(links) ? links : [];
    return arr
      .map(unwrapLinkRow)
      .filter((x): x is IssuedOvpnFileDto => !!x && (x.id != null || x.commonName != null));
  }, [links]);

  const handleRevoke = useCallback(
    async (linkId: number, commonName: string) => {
      if (!window.confirm(`Revoke VLESS client link for ${commonName}?`)) return;
      try {
        const data: RevokeFileRequest = {
          vpnServerId: Number(vpnServerId),
          ovpnFileId: linkId,
          commonName,
        };
        await postApiXrayClientLinksRevokeFile(data);
        await onRevoke();
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        const msg = e.response?.data?.message || e.message || "Error revoking client link.";
        toast.error(msg);
      }
    },
    [vpnServerId, onRevoke],
  );

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

  const filtered = useMemo(() => {
    return items.filter((x) => {
      const byCN = (x.commonName ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      const byIssuedTo =
        issuedToFilter === "" || (x.issuedTo ?? "").toLowerCase().includes(issuedToFilter.toLowerCase());
      return byCN && byIssuedTo;
    });
  }, [items, searchQuery, issuedToFilter]);

  const rows = filtered.map((row, index) => {
    const id = row.id != null ? String(row.id) : `${row.commonName ?? "cn"}-${index}`;
    return {
      id,
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
  });

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
      width: 230,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="action-container">
          {!params.row.isRevoked && (
            <button className="btn danger" onClick={() => handleRevoke(Number(params.row.id), params.row.commonName)}>
              Revoke
            </button>
          )}
          <button
            className="btn secondary"
            onClick={() => handleDownload(Number(params.row.id))}
            title="Download client link file"
          >
            <FaDownload className="icon" style={{ marginRight: 6 }} />
            Download
          </button>
        </div>
      ),
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
            type="text"
            placeholder="Search by Common Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
          <input
            type="text"
            placeholder="Search by Issued To"
            value={issuedToFilter}
            onChange={(e) => setIssuedToFilter(e.target.value)}
            className="input"
          />
        </div>

        <StyledDataGrid
          getRowId={(row) => row.id}
          rows={rows}
          columns={columns}
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
          loading={loading}
          slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default XrayClientLinksTable;
