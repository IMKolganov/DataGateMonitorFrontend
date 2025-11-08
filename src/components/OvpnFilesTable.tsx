import React, { useState, useCallback, useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";
import type { IssuedOvpnFileDto, RevokeFileRequest, DownloadFileRequest } from "../api/orval/model";
import { usePostApiOpenVpnFilesRevokeFile, usePostApiOpenVpnFilesDownloadFile } from "../api/orval/open-vpn-files/open-vpn-files";
import { FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import { formatDateWithOffset } from "../utils/utils";

const safeFormatDate = (input?: string | null): string => {
  if (!input) return "";
  const date = new Date(input);
  return isNaN(date.getTime()) ? "Invalid date" : formatDateWithOffset(date);
};

// Accept both wrapped and plain items
type OvpnRowInput = { issuedOvpnFile?: IssuedOvpnFileDto } | Record<string, any> | IssuedOvpnFileDto;

interface Props {
  ovpnFiles: OvpnRowInput[];
  vpnServerId: string;
  onRevoke: () => Promise<void> | void;
  loading: boolean;
}

// Super-tolerant unwrap: tries multiple common wrapper keys
function unwrapOvpnItem(x: OvpnRowInput): IssuedOvpnFileDto | null {
  if (!x) return null;
  // already a DTO-like object
  if ((x as IssuedOvpnFileDto).commonName != null || (x as IssuedOvpnFileDto).id != null) {
    return x as IssuedOvpnFileDto;
  }
  const any = x as any;
  // common wrapper keys we might see from various backends/mappers
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
    const v = any?.[k];
    if (v && (v.commonName != null || v.id != null)) return v as IssuedOvpnFileDto;
  }
  // sometimes nested deeper
  if (any?.payload?.issuedOvpnFile) return any.payload.issuedOvpnFile as IssuedOvpnFileDto;
  return null;
}

const OvpnFilesTable: React.FC<Props> = ({ ovpnFiles, vpnServerId, onRevoke, loading }) => {
  // Mutations (unwrapped by ogmMutator in this project)
  const { mutateAsync: revokeMutate, isPending: revokePending } = usePostApiOpenVpnFilesRevokeFile();
  const { mutateAsync: downloadMutate, isPending: downloadPending } = usePostApiOpenVpnFilesDownloadFile();

  const [searchQuery, setSearchQuery] = useState("");
  const [issuedToFilter, setIssuedToFilter] = useState("");

  // Normalize input list to IssuedOvpnFileDto[]
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
          issuedOvpnFileId: ovpnFileId,
          commonName,
        } as unknown as RevokeFileRequest;

        await revokeMutate({ data });
        // success toast is shown by parent
        await onRevoke();
      } catch (err: any) {
        const msg = err?.response?.data?.Message || err?.message || "Error revoking OVPN file.";
        toast.error(msg);
        console.error("Failed to revoke OVPN file", err);
      }
    },
    [vpnServerId, revokeMutate, onRevoke]
  );

  const handleDownload = useCallback(
    async (issuedOvpnFileId: number) => {
      try {
        const data: DownloadFileRequest = {
          vpnServerId: Number(vpnServerId),
          issuedOvpnFileId,
        } as unknown as DownloadFileRequest;

        const resp: any = await downloadMutate({ data });

        const fileName: string =
          resp?.fileName || resp?.data?.fileName || `client_${issuedOvpnFileId}.ovpn`;
        const b64: string = resp?.contentBase64 || resp?.data?.contentBase64;

        if (!b64) throw new Error("No file content received.");

        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/x-openvpn-profile" });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        toast.success("File downloaded.");
      } catch (err: any) {
        const msg = err?.response?.data?.Message || err?.message || "Error downloading file.";
        toast.error(msg);
        console.error("Download failed:", err);
      }
    },
    [downloadMutate, vpnServerId]
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
    // Ensure stable, string id for DataGrid
    const id = issuedOvpnFile.id != null
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
        <div className="action-container" style={{ display: "flex", gap: 8 }}>
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
      <div className="table-container">
        <div className="filters" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
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
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableColumnFilter
          disableColumnMenu
          localeText={{
            noRowsLabel: loading ? "🔄 Loading OVPN files..." : "📭 No OVPN files found",
          }}
          loading={loading || revokePending || downloadPending}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default OvpnFilesTable;
