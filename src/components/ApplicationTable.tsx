import React, { useState } from "react";
import { GridColDef } from "@mui/x-data-grid";
import { FaTrash, FaCopy } from "react-icons/fa";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";
import { revokeApplication } from "../utils/api";

interface Application {
  clientId: string;
  name: string;
  clientSecret: string;
  isRevoked: boolean;
  createDate: string;
}

interface ApplicationTableProps {
  applications: Application[];
  refreshApps: () => void;
}

const ApplicationTable: React.FC<ApplicationTableProps> = ({ applications, refreshApps }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRevoke = async (clientId: string) => {
    setLoading(true);
    try {
      await revokeApplication(clientId);
      refreshApps();
    } catch (error) {
      console.error("Failed to revoke application:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const rows = applications.map((app, index) => ({
    id: index + 1,
    clientId: app.clientId,
    name: app.name,
    clientSecret: app.clientSecret,
    createDate: new Date(app.createDate).toLocaleString(),
    status: app.isRevoked ? "Revoked ❌" : "Active ✅",
  }));

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "name", headerName: "Name", flex: 1 },
    { field: "clientId", headerName: "Client ID", flex: 1 },
    {
      field: "clientSecret",
      headerName: "Client Secret",
      flex: 1,
      renderCell: (params) => (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px" }}>{params.value}</span>
          <button onClick={() => handleCopy(params.value)} className="copy-btn">
            {FaCopy({ className: "icon" })}
          </button>
          {copied === params.value && <span className="copied-text">✔ Copied!</span>}
        </div>
      ),
    },
    { field: "createDate", headerName: "Created", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      renderCell: (params) => (
        <div className="action-container">
          <button
            className="btn danger"
            onClick={() => handleRevoke(params.row.clientId)}
            disabled={loading || params.row.status === "Revoked ❌"}
          >
            {FaTrash({ className: "icon" })} Revoke
          </button>
        </div>
      ),
    },
  ];

  return (
    <CustomThemeProvider>
      <div
        style={{
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
          pageSizeOptions={[5, 10, 20, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableColumnFilter
          disableColumnMenu
          localeText={{
            noRowsLabel: "📭 No applications registered",
          }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default ApplicationTable;
