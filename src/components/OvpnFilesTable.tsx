import React, { useState, useCallback } from "react";
import { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";
import { IssuedOvpnFile } from "../utils/types";
import { revokeOvpnFile, downloadOvpnFile } from "../utils/api";
import { FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import { formatDateWithOffset } from "../utils/utils";

const safeFormatDate = (input?: string | null): string => {
  if (!input) return "—";
  const date = new Date(input);
  return isNaN(date.getTime()) ? "Invalid date" : formatDateWithOffset(date);
};

const OvpnFilesTable: React.FC<{ 
  ovpnFiles: IssuedOvpnFile[], 
  vpnServerId: string, 
  onRevoke: () => void, 
  loading: boolean 
}> = ({ ovpnFiles = [], vpnServerId, onRevoke, loading }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [issuedToFilter, setIssuedToFilter] = useState("");

  const handleRevoke = useCallback(async (commonName: string) => {
    if (!window.confirm(`Are you sure you want to revoke OVPN file ${commonName}?`)) return;
    try {
      await revokeOvpnFile(vpnServerId, commonName);
      onRevoke();
      toast.success("OVPN file has been successfully revoked.");
    } catch (error) {
      console.error("Failed to revoke OVPN file", error);
      toast.error("Error revoking OVPN file.");
    }
  }, [vpnServerId, onRevoke]);

  const handleDownload = async (issuedOvpnFileId: number) => {
    try {
      await downloadOvpnFile(issuedOvpnFileId, vpnServerId);
    } catch (error: any) {
      console.error("Download failed:", error);
      toast.error(error.message || "Error downloading file.");
    }
  };  

  const filteredFiles = ovpnFiles.filter(file =>
    (file.commonName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) &&
    (issuedToFilter === "" || (file.issuedTo?.toLowerCase() || "").includes(issuedToFilter.toLowerCase()))
  );

  const rows = filteredFiles.map((file) => ({
    id: file.id ?? "—",
    externalId: file.externalId ?? "—",
    commonName: file.commonName ?? "—",
    fileName: file.fileName ?? "—",
    filePath: file.filePath ?? "—",
    issuedAt: safeFormatDate(file.issuedAt),
    issuedTo: file.issuedTo ?? "—",
    certFilePath: file.certFilePath ?? "—",
    keyFilePath: file.keyFilePath ?? "—",
    isRevoked: file.isRevoked ? "❌ Revoked" : "✅ Active",
    message: file.message ?? "—",
    lastUpdate: safeFormatDate(file.lastUpdate),
    createDate: safeFormatDate(file.createDate),
  }));

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "externalId", headerName: "External ID", flex: 1 },
    { field: "commonName", headerName: "Common Name", flex: 1 },
    { field: "fileName", headerName: "File Name", flex: 1 },
    { field: "filePath", headerName: "File Path", flex: 1 },
    { field: "issuedAt", headerName: "Issued Date", flex: 1 },
    { field: "issuedTo", headerName: "Issued To", flex: 1 },
    { field: "certFilePath", headerName: "Cert File Path", flex: 1 },
    { field: "keyFilePath", headerName: "Key File Path", flex: 1 },
    { field: "isRevoked", headerName: "Status", flex: 1 },
    { field: "message", headerName: "Message", flex: 1 },
    { field: "lastUpdate", headerName: "Last Update", flex: 1 },
    { field: "createDate", headerName: "Created Date", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      width: 200,
      renderCell: (params) => (
        <div className="action-container">
          {params.row.isRevoked === "✅ Active" && (
            <button className="btn danger" onClick={() => handleRevoke(params.row.commonName)}>
              Revoke
            </button>
          )}
          <button className="btn secondary" onClick={() => handleDownload(params.row.id)}>
            <FaDownload /> Download
          </button>
        </div>
      ),
    },
  ];

  return (
    <CustomThemeProvider>
      <div className="table-container">
        <div className="filters">
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
          loading={loading}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default OvpnFilesTable;