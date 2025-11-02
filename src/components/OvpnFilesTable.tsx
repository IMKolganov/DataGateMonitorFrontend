import React, { useState, useCallback } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";
// import type { IssuedOvpnFile } from "../utils/types";
// import { revokeClientOvpnFile, downloadClientOvpnFile } from "../utils/api/OpenVpnFiles";
import { FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import { formatDateWithOffset } from "../utils/utils";

const safeFormatDate = (input?: string | null): string => {
  if (!input) return "";
  const date = new Date(input);
  return isNaN(date.getTime()) ? "Invalid date" : formatDateWithOffset(date);
};

interface Props {
  ovpnFiles: { issuedOvpnFile: IssuedOvpnFile }[];
  vpnServerId: string;
  onRevoke: () => void;
  loading: boolean;
}

const OvpnFilesTable: React.FC<Props> = ({ ovpnFiles, vpnServerId, onRevoke, loading }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [issuedToFilter, setIssuedToFilter] = useState("");

  const handleRevoke = useCallback(
    async (ovpnFileId: number, commonName: string) => {
      if (!window.confirm(`Are you sure you want to revoke OVPN file ${commonName}?`)) return;
      try {
        await revokeClientOvpnFile(Number(vpnServerId), ovpnFileId, commonName);
        onRevoke();
        toast.success("OVPN file has been successfully revoked.");
      } catch (error) {
        console.error("Failed to revoke OVPN file", error);
        toast.error("Error revoking OVPN file.");
      }
    },
    [vpnServerId, onRevoke]
  );

  const handleDownload = async (issuedOvpnFileId: number) => {
    try {
      await downloadClientOvpnFile(issuedOvpnFileId, vpnServerId);
    } catch (error: any) {
      console.error("Download failed:", error);
      toast.error(error.message || "Error downloading file.");
    }
  };

  const filteredFiles = ovpnFiles
    .filter((x) => x.issuedOvpnFile?.id != null)
    .filter(
      (x) =>
        (x.issuedOvpnFile.commonName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) &&
        (issuedToFilter === "" || (x.issuedOvpnFile.issuedTo?.toLowerCase() || "").includes(issuedToFilter.toLowerCase()))
    );

  const rows = filteredFiles.map(({ issuedOvpnFile }, index) => ({
    id: issuedOvpnFile.id ?? `${issuedOvpnFile.commonName}-${index}`,
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
    {
      field: "isRevoked",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => (params.value ? "❌ Revoked" : "✅ Active"),
    },
    { field: "message", headerName: "Message", flex: 1 },
    { field: "lastUpdate", headerName: "Last Update", flex: 1 },
    { field: "createDate", headerName: "Created Date", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <div className="action-container">
          {!params.row.isRevoked && (
            <button className="btn danger" onClick={() => handleRevoke(params.row.id, params.row.commonName)}>
              Revoke
            </button>
          )}
          <button className="btn secondary" onClick={() => handleDownload(params.row.id)}>
            {FaDownload({ className: "icon" })} Download
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
          loading={loading}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default OvpnFilesTable;
