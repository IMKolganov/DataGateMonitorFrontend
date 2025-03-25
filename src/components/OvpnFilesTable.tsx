import React, { useState, useCallback } from "react";
import { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";
import { IssuedOvpnFile } from "../utils/types";
import { revokeOvpnFile, downloadOvpnFile } from "../utils/api";
import { FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";

const OvpnFilesTable: React.FC<{ 
  ovpnFiles: IssuedOvpnFile[], 
  vpnServerId: string, 
  onRevoke: () => void, 
  loading: boolean 
}> = ({ ovpnFiles, vpnServerId, onRevoke, loading }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [issuedToFilter, setIssuedToFilter] = useState("");

  const handleRevoke = useCallback(async (externalId: string) => {
    if (!window.confirm(`Are you sure you want to revoke OVPN file ${externalId}?`)) return;
    try {
      await revokeOvpnFile(vpnServerId, externalId);
      onRevoke();
    } catch (error) {
      console.error("Failed to revoke OVPN file", error);
      toast.error("Error revoking OVPN file.");
    }
  }, [vpnServerId, onRevoke]);

  const handleDownload = async (issuedOvpnFileId: number) => {
    try {
      await downloadOvpnFile(issuedOvpnFileId, vpnServerId);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Error downloading file.");
    }
  };

  const filteredFiles = ovpnFiles.filter(file =>
    file.commonName.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (issuedToFilter === "" || file.issuedTo.toLowerCase().includes(issuedToFilter.toLowerCase()))
  );

  const rows = filteredFiles.map((file) => ({
    id: file.id,
    externalId: file.externalId,
    commonName: file.commonName,
    certId: file.certId || "—",
    fileName: file.fileName,
    filePath: file.filePath,
    issuedAt: new Date(file.issuedAt).toLocaleString(),
    issuedTo: file.issuedTo,
    pemFilePath: file.pemFilePath || "—",
    certFilePath: file.certFilePath || "—",
    keyFilePath: file.keyFilePath || "—",
    reqFilePath: file.reqFilePath || "—",
    isRevoked: file.isRevoked ? "❌ Revoked" : "✅ Active",
    message: file.message || "—",
    lastUpdate: new Date(file.lastUpdate).toLocaleString(),
    createDate: new Date(file.createDate).toLocaleString(),
  }));

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "externalId", headerName: "External ID", flex: 1 },
    { field: "commonName", headerName: "Common Name", flex: 1 },
    { field: "certId", headerName: "Cert ID", flex: 1 },
    { field: "fileName", headerName: "File Name", flex: 1 },
    { field: "filePath", headerName: "File Path", flex: 1 },
    { field: "issuedAt", headerName: "Issued Date", flex: 1 },
    { field: "issuedTo", headerName: "Issued To", flex: 1 },
    { field: "pemFilePath", headerName: "PEM File Path", flex: 1 },
    { field: "certFilePath", headerName: "Cert File Path", flex: 1 },
    { field: "keyFilePath", headerName: "Key File Path", flex: 1 },
    { field: "reqFilePath", headerName: "Req File Path", flex: 1 },
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
          <button className="btn danger" onClick={() => handleRevoke(params.row.externalId)}>
            Revoke
          </button>
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
            noRowsLabel: "📭 No OVPN files found",
          }}
          loading={loading}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default OvpnFilesTable;
