import React, { useState, useCallback } from "react";
import { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";
import { Certificate, CertificatesTableProps } from "../utils/types";
import { revokeCertificate } from "../utils/api";
import "../css/CertificatesTable.css";

const renderStatus = (status: Certificate["status"]) => {
  switch (status) {
    case 0:
      return "✅ Active";
    case 1:
      return "❌ Revoked";
    case 2:
      return "⌛ Expired";
    case 3:
    default:
      return "❓ Unknown";
  }
};

const CertificatesTable: React.FC<CertificatesTableProps> = ({ certificates, vpnServerId, onRevoke, loading }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [serialNumberQuery, setSerialNumberQuery] = useState("");

  const handleRevoke = useCallback(async (commonName: string) => {
    if (!window.confirm(`Are you sure you want to revoke certificate for ${commonName}?`)) return;

    try {
      await revokeCertificate(vpnServerId, commonName);
      onRevoke();
    } catch (error) {
      console.error("Failed to revoke certificate", error);
      alert("Error revoking certificate.");
    }
  }, [vpnServerId, onRevoke]);

  const filteredCertificates = certificates.filter(cert =>
    cert.commonName.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedStatus === "" || cert.status.toString() === selectedStatus) &&
    cert.serialNumber.toLowerCase().includes(serialNumberQuery.toLowerCase())
  );

  const rows = filteredCertificates.map((cert, index) => ({
    id: index + 1,
    commonName: cert.commonName,
    status: cert.status,
    statusText: renderStatus(cert.status),
    expiryDate: new Date(cert.expiryDate).toLocaleDateString(),
    revokeDate: cert.revokeDate ? new Date(cert.revokeDate).toLocaleDateString() : "—",
    serialNumber: cert.serialNumber,
  }));

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "commonName", headerName: "Common Name", flex: 1 },
    { field: "statusText", headerName: "Status", flex: 1 },
    { field: "expiryDate", headerName: "Expiry Date", flex: 1 },
    { field: "revokeDate", headerName: "Revoke Date", flex: 1 },
    { field: "serialNumber", headerName: "Serial Number", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      renderCell: (params) => {
        if (params.row.status !== 0) {
          return <span className="no-actions">No actions</span>;
        }

        return (
          <div className="action-container">
            <button className="btn danger" onClick={() => handleRevoke(params.row.commonName)}>
              Revoke
            </button>
          </div>
        );
      },
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
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="input">
            <option value="">All Statuses</option>
            <option value="0">✅ Active</option>
            <option value="1">❌ Revoked</option>
            <option value="2">⌛ Expired</option>
            <option value="3">❓ Unknown</option>
          </select>
          <input
            type="text"
            placeholder="Search by Serial Number"
            value={serialNumberQuery}
            onChange={(e) => setSerialNumberQuery(e.target.value)}
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
            noRowsLabel: loading ? "🔄 Loading certificates..." : "📭 No certificates found",
          }}
          loading={loading}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default CertificatesTable;
