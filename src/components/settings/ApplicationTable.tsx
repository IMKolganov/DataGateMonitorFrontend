// src/components/ApplicationTable.tsx
import React, { useState, useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { FaTrash, FaCopy } from "react-icons/fa";
import StyledDataGrid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import { toast } from "react-toastify";

import type { ApplicationDto, RevokeApplicationRequest } from "../../api/orval/model";
import { usePostApiApplicationsRevoke } from "../../api/orval/applications/applications.ts";
import "../../css/Table.css";

interface ApplicationTableProps {
  applications: ApplicationDto[];
  refreshApps: () => void;
}

const ApplicationTable: React.FC<ApplicationTableProps> = ({ applications, refreshApps }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const revokeMutation = usePostApiApplicationsRevoke({
    mutation: {
      onSuccess: () => {
        toast.success("Application revoked");
        refreshApps();
      },
      onError: (e: any) => {
        toast.error(
          e?.response?.data?.error ||
            e?.response?.data?.message ||
            e?.message ||
            "Failed to revoke application."
        );
      },
    },
  });

  const loading = revokeMutation.isPending;

  const handleRevoke = async (clientId: string) => {
    const body: RevokeApplicationRequest = { clientId };
    await revokeMutation.mutateAsync({ data: body });
  };

  const handleCopy = (text?: string | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const rows = useMemo(
    () =>
      (applications ?? []).map((app, index) => ({
        id: index + 1,
        clientId: String(app.clientId ?? ""),
        name: String(app.name ?? ""),
        clientSecret: app.clientSecret ?? "",
        createDate: app.createDate
          ? new Date(app.createDate).toLocaleString()
          : "",
        status: "unknown",//app.isRevoked ? "Revoked ❌" : "Active ✅",
      })),
    [applications]
  );

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "name", headerName: "Name", flex: 1 },
    { field: "clientId", headerName: "Client ID", flex: 1 },
    {
      field: "clientSecret",
      headerName: "Client Secret",
      flex: 1,
      renderCell: (params) => {
        const value: string = params.value || "";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12 }}>
              {value ? value : "—"}
            </span>
            <button
              onClick={() => handleCopy(value)}
              className="copy-btn"
              disabled={!value}
              title={!value ? "Secret is not available (shown only once on create)" : "Copy"}
            >
              {FaCopy({ className: "icon" })}
            </button>
            {copied === value && value && (
              <span className="copied-text">✔ Copied!</span>
            )}
          </div>
        );
      },
    },
    { field: "createDate", headerName: "Created", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      width: 130,
      renderCell: (params) => {
        const clientId: string = params.row.clientId;
        const isRevoked = params.row.status === "Revoked ❌";
        return (
          <div className="action-container">
            <button
              className="btn danger"
              onClick={() => handleRevoke(clientId)}
              disabled={loading || isRevoked}
              title={isRevoked ? "Already revoked" : "Revoke application"}
            >
              {FaTrash({ className: "icon" })} Revoke
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <CustomThemeProvider>
      <div
        style={{
          width: "100%",
          backgroundColor: "#0d1117",
          padding: 10,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <StyledDataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={[5, 10, 20, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableColumnFilter
          disableColumnMenu
          localeText={{ noRowsLabel: "📭 No applications registered" }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default ApplicationTable;
