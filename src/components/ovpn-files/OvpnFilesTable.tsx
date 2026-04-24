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
import { usePostApiOpenVpnFilesRevokeFile, usePostApiOpenVpnFilesDownloadFile } from "../../api/orval/open-vpn-files/open-vpn-files.ts";
import { FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import { formatDateWithOffset } from "../../utils/utils.ts";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize";
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
  onRevoke: () => Promise<void> | void;
  loading: boolean;
}

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

const OvpnFilesTable: React.FC<Props> = ({ ovpnFiles, vpnServerId, onRevoke, loading }) => {
  const { mutateAsync: revokeMutate, isPending: revokePending } = usePostApiOpenVpnFilesRevokeFile();
  const { mutateAsync: downloadMutate, isPending: downloadPending } = usePostApiOpenVpnFilesDownloadFile();

  const [searchQuery, setSearchQuery] = useState("");
  const [issuedToFilter, setIssuedToFilter] = useState("");
  const [ovpnFilesGridPage, setOvpnFilesGridPage] = useState(0);
  const [ovpnFilesPageSize, setOvpnFilesPageSize] = usePersistedPageSize(
    `ovpn-files:${vpnServerId}`,
    10,
    "5,10,20,100",
  );

  const items: IssuedOvpnFileDto[] = useMemo(() => {
    const arr = Array.isArray(ovpnFiles) ? ovpnFiles : [];
    return arr
      .map(unwrapOvpnItem)
      .filter((x): x is IssuedOvpnFileDto => !!x && (x.id != null || x.commonName != null));
  }, [ovpnFiles]);

  const handleRevoke = useCallback(
    async (ovpnFileId: number, commonName: string) => {
      if (!window.confirm(`Are you sure you want to revoke OVPN file ${commonName}?`)) return;
      try {
        const data: RevokeFileRequest = {
          vpnServerId: Number(vpnServerId),
          ovpnFileId: ovpnFileId,
          commonName,
        };

        await revokeMutate({ data });
        await onRevoke();
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };

        const msg = e.response?.data?.message || e.message || "Error revoking OVPN file.";

        toast.error(msg);
      }
    },
    [vpnServerId, revokeMutate, onRevoke],
  );

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

  const filtered = useMemo(() => {
    return items.filter((x) => {
      const byCN = (x.commonName ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      const byIssuedTo =
        issuedToFilter === "" || (x.issuedTo ?? "").toLowerCase().includes(issuedToFilter.toLowerCase());
      return byCN && byIssuedTo;
    });
  }, [items, searchQuery, issuedToFilter]);

  const rows = filtered.map((issuedOvpnFile, index) => {
    const id =
      issuedOvpnFile.id != null
        ? String(issuedOvpnFile.id)
        : `${issuedOvpnFile.commonName ?? "cn"}-${index}`;

    return {
      id,
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
    };
  });

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 110 },
    { field: "externalId", headerName: "External ID", flex: 1, minWidth: 120 },
    { field: "commonName", headerName: "Common Name", flex: 1, minWidth: 160 },
    { field: "fileName", headerName: "File Name", flex: 1, minWidth: 160 },
    { field: "issuedAt", headerName: "Issued Date", flex: 0.8, minWidth: 140 },
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
      width: 230,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="action-container">
          {!params.row.isRevoked && (
            <button
              className="btn danger"
              onClick={() => handleRevoke(Number(params.row.id), params.row.commonName)}
              disabled={revokePending}
            >
              Revoke
            </button>
          )}
          <button
            className="btn secondary"
            onClick={() => handleDownload(Number(params.row.id))}
            disabled={downloadPending}
            title="Download OVPN"
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
          paginationModel={{ page: ovpnFilesGridPage, pageSize: ovpnFilesPageSize }}
          onPaginationModelChange={(m) => {
            setOvpnFilesGridPage(m.page);
            setOvpnFilesPageSize(m.pageSize);
          }}
          localeText={{
            noRowsLabel: loading ? "🔄 Loading OVPN files..." : "📭 No OVPN files found",
          }}
          loading={loading || revokePending || downloadPending}
          slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default OvpnFilesTable;
