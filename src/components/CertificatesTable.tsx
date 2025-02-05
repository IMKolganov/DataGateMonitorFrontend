import React from "react";
import { GridColDef } from "@mui/x-data-grid";
import axios from "axios";
import TableStyle, { StyledDataGrid } from "../components/TableStyle";

interface Certificate {
  commonName: string;
  status: number;
  expiryDate: string;
  revokeDate?: string | null;
  serialNumber: string;
}

interface CertificatesTableProps {
  certificates: Certificate[];
  onRevoke: () => void;
}

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

const CertificatesTable: React.FC<CertificatesTableProps> = ({ certificates, onRevoke }) => {
  if (!certificates || certificates.length === 0) {
    return <p style={{ textAlign: "center", padding: "20px" }}>📭 No certificates found</p>;
  }

  const handleRevoke = async (commonName: string) => {
    if (!window.confirm(`Are you sure you want to revoke certificate for ${commonName}?`)) return;

    try {
      await axios.post(`/api/revoke`, { commonName });
      onRevoke();
    } catch (error) {
      console.error("Failed to revoke certificate", error);
      alert("Error revoking certificate.");
    }
  };

  const rows = certificates.map((cert, index) => ({
    id: index + 1,
    commonName: cert.commonName,
    status: renderStatus(cert.status),
    expiryDate: new Date(cert.expiryDate).toLocaleDateString(),
    revokeDate: cert.revokeDate ? new Date(cert.revokeDate).toLocaleDateString() : "—",
    serialNumber: cert.serialNumber,
  }));

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "commonName", headerName: "Common Name", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    { field: "expiryDate", headerName: "Expiry Date", flex: 1 },
    { field: "revokeDate", headerName: "Revoke Date", flex: 1 },
    { field: "serialNumber", headerName: "Serial Number", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      renderCell: (params) =>
        //status 0 is active
        params.row.status === 0? (
          <button className="btn danger" onClick={() => handleRevoke(params.row.commonName)}>
            Revoke
          </button>
        ) : (
          <span style={{ color: "gray" }}>No actions</span>
        ),
    },
  ];

  return (
    <TableStyle>
      <StyledDataGrid
        rows={rows}
        columns={columns}
        pageSizeOptions={[5, 10, 20, 100]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        disableColumnFilter
        disableColumnMenu
        aria-hidden={false}
      />
    </TableStyle>
  );
};

export default CertificatesTable;
