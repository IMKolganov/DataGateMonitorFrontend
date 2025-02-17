import React, { useState, useCallback } from "react";
import { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";
import { IssuedOvpnFile } from "../utils/types";
import { revokeOvpnFile } from "../utils/api";

const OvpnFilesTable: React.FC<{ ovpnFiles: IssuedOvpnFile[], vpnServerId: string, onRevoke: () => void }> = ({ ovpnFiles, vpnServerId, onRevoke }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [issuedToFilter, setIssuedToFilter] = useState("");

  const handleRevoke = useCallback(async (externalId: string) => {
    if (!window.confirm(`Are you sure you want to revoke OVPN file ${externalId}?`)) return;
    try {
      await revokeOvpnFile(vpnServerId, externalId);
      onRevoke();
    } catch (error) {
      console.error("Failed to revoke OVPN file", error);
      alert("Error revoking OVPN file.");
    }
  }, [vpnServerId, onRevoke]);

  const filteredFiles = ovpnFiles.filter(file =>
    file.commonName.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (issuedToFilter === "" || file.issuedTo.toLowerCase().includes(issuedToFilter.toLowerCase()))
  );

  const rows = filteredFiles.map((file, index) => ({
    id: index + 1,
    externalId: file.externalId,
    commonName: file.commonName,
    issuedTo: file.issuedTo,
    issuedAt: new Date(file.issuedAt).toLocaleDateString(),
  }));

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "commonName", headerName: "Common Name", flex: 1 },
    { field: "issuedTo", headerName: "Issued To", flex: 1 },
    { field: "issuedAt", headerName: "Issued Date", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      renderCell: (params) => (
        <div className="action-container">
          <button className="btn danger" onClick={() => handleRevoke(params.row.externalId)}>
            Revoke
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
        />
      </div>
    </CustomThemeProvider>
  );
};

export default OvpnFilesTable;
