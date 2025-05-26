import React, { useState, useCallback } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";
import type { Certificate, CertificatesTableProps } from "../utils/types";
import { revokeCertificate } from "../utils/api";
import "../css/CertificatesTable.css";
import { toast } from "react-toastify";
import { formatDateWithOffset } from "../utils/utils";

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

const CertificatesTable: React.FC<CertificatesTableProps> = ({
  certificates = [],
  vpnServerId,
  onRevoke,
  loading
}) => {
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
      toast.error("Error revoking certificate.");
    }
  }, [vpnServerId, onRevoke]);

  const filteredCertificates = certificates.filter(cert => {
    const name = cert.commonName?.toLowerCase() || "";
    const serial = cert.serialNumber?.toLowerCase() || "";
    const status = cert.status?.toString() ?? "";

    return (
      name.includes(searchQuery.toLowerCase()) &&
      (selectedStatus === "" || status === selectedStatus) &&
      serial.includes(serialNumberQuery.toLowerCase())
    );
  });

  const rows = filteredCertificates.map((cert, index) => ({
    id: index + 1,
    commonName: cert.commonName || "N/A",
    status: cert.status ?? 3, // Default to "Unknown"
    statusText: renderStatus(cert.status),
    expiryDate: cert.expiryDate ? formatDateWithOffset(new Date(cert.expiryDate)) : "N/A",
    revokeDate: cert.revokeDate ? formatDateWithOffset(new Date(cert.revokeDate)) : "N/A",
    serialNumber: cert.serialNumber || "N/A",
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
