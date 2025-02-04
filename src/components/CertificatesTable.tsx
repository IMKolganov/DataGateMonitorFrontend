import React from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { ThemeProvider, createTheme, styled } from "@mui/material/styles";
import axios from "axios";

interface Certificate {
  commonName: string;
  status: "Active" | "Revoked";
  expiryDate: string;
  serialNumber: string;
}

interface CertificatesTableProps {
  certificates: Certificate[];
  onRevoke: () => void;
}

const githubDarkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0d1117",
      paper: "#161b22",
    },
    text: {
      primary: "#c9d1d9",
      secondary: "#8b949e",
    },
  },
});

const StyledDataGrid = styled(DataGrid)({
  fontFamily: "monospace",
  border: "none",
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#161b22",
    color: "#c9d1d9",
    fontSize: "14px",
    fontWeight: "bold",
    borderBottom: "1px solid #30363d",
  },
  "& .MuiDataGrid-cell": {
    color: "#c9d1d9",
    borderBottom: "1px solid #30363d",
  },
  "& .MuiDataGrid-row": {
    backgroundColor: "#0d1117",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "#21262d",
  },
  "& .MuiDataGrid-footerContainer": {
    backgroundColor: "#161b22",
    color: "#c9d1d9",
    borderTop: "1px solid #30363d",
  },
});

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
    status: cert.status,
    expiryDate: new Date(cert.expiryDate).toLocaleDateString(),
    serialNumber: cert.serialNumber,
  }));

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "commonName", headerName: "Common Name", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    { field: "expiryDate", headerName: "Expiry Date", flex: 1 },
    { field: "serialNumber", headerName: "Serial Number", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      renderCell: (params) => (
        params.row.status === "Active" ? (
          <button className="btn danger" onClick={() => handleRevoke(params.row.commonName)}>Revoke</button>
        ) : (
          <span style={{ color: "gray" }}>Revoked</span>
        )
      ),
    },
  ];

  return (
    <ThemeProvider theme={githubDarkTheme}>
      <div
        style={{
          height: 500,
          width: "100%",
          backgroundColor: "#0d1117",
          padding: "10px",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
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
      </div>
    </ThemeProvider>
  );
};

export default CertificatesTable;
