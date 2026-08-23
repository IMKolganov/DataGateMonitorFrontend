// src/components/ApplicationTable.tsx
import React, { useState, useMemo, useCallback } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { FaTrash, FaCopy } from "react-icons/fa";
import Grid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import { toast } from "react-toastify";

import type { ApplicationDto, RevokeApplicationRequest } from "../../api/orvalModelShim";
import { usePostApiApplicationsRevoke } from "../../api/orval/applications/applications.ts";
import { GridRowActions, RowActionButton } from "../ui/GridRowActions.tsx";
import "../../css/Table.css";
import { errorMessage } from "../../utils/errorMessage";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize";

interface ApplicationTableProps {
  applications: ApplicationDto[];
  refreshApps: () => void;
}

type AppRow = {
  id: string;
  clientId: string;
  name: string;
  clientSecret: string;
  createDate: string;
  isRevoked: boolean;
  isSystem: boolean;
  statusLabel: string;
};

const ApplicationTable: React.FC<ApplicationTableProps> = ({ applications, refreshApps }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [appsGridPage, setAppsGridPage] = useState(0);
  const [appsPageSize, setAppsPageSize] = usePersistedPageSize(
    "applications-settings",
    10,
    "5,10,20,50,100",
  );

  const revokeMutation = usePostApiApplicationsRevoke({
    mutation: {
      onSuccess: () => {
        toast.success("API client revoked");
        refreshApps();
      },
      onError: (e: unknown) => {
        toast.error(errorMessage(e) || "Failed to revoke API client.");
      },
    },
  });

  const loading = revokeMutation.isPending;

  const handleCopy = useCallback((text?: string | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleRevoke = useCallback(
    async (row: AppRow) => {
      if (row.isRevoked) return;
      if (row.isSystem) {
        toast.error("System API clients cannot be revoked.");
        return;
      }

      const confirmed = window.confirm(
        `Revoke API client "${row.name}"?\n\nExisting tokens may remain valid until they expire, but new tokens will not be issued.`,
      );
      if (!confirmed) return;

      const body: RevokeApplicationRequest = { clientId: row.clientId };
      await revokeMutation.mutateAsync({ data: body });
    },
    [revokeMutation],
  );

  const rows = useMemo<AppRow[]>(
    () =>
      (applications ?? []).map((app) => {
        const clientId = String(app.clientId ?? "");
        const isRevoked = Boolean(app.isRevoked);
        const isSystem = Boolean(app.isSystem);
        let statusLabel = "Active";
        if (isSystem && isRevoked) statusLabel = "System · Revoked";
        else if (isSystem) statusLabel = "System";
        else if (isRevoked) statusLabel = "Revoked";

        return {
          id: clientId || `row-${app.name ?? "unknown"}`,
          clientId,
          name: String(app.name ?? ""),
          clientSecret: app.clientSecret ?? "",
          createDate: app.createDate ? new Date(app.createDate).toLocaleString() : "",
          isRevoked,
          isSystem,
          statusLabel,
        };
      }),
    [applications],
  );

  const renderCopyableCell = (value: string, emptyHint: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span className="small-text" title={value || emptyHint}>
        {value || "—"}
      </span>
      <RowActionButton
        title={value ? "Copy" : emptyHint}
        disabled={!value}
        onClick={() => handleCopy(value)}
        icon={<FaCopy className="icon" />}
      />
      {copied === value && value && <span className="copied-text">✔ Copied!</span>}
    </div>
  );

  const columns: GridColDef<AppRow>[] = [
    { field: "name", headerName: "Name", flex: 1, minWidth: 140 },
    {
      field: "clientId",
      headerName: "Client ID",
      flex: 1.2,
      minWidth: 220,
      renderCell: (params) => renderCopyableCell(params.value as string, "No client ID"),
    },
    {
      field: "clientSecret",
      headerName: "Client Secret",
      flex: 1,
      minWidth: 180,
      renderCell: (params) =>
        renderCopyableCell(
          params.value as string,
          "Not available (shown only once on create)",
        ),
    },
    { field: "createDate", headerName: "Created", flex: 1, minWidth: 160 },
    {
      field: "statusLabel",
      headerName: "Status",
      width: 130,
      renderCell: (params) => {
        const row = params.row;
        const className = row.isRevoked
          ? "status revoked"
          : row.isSystem
            ? "status system"
            : "status active";
        return <span className={className}>{params.value}</span>;
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const row = params.row;
        const revokeDisabled = loading || row.isRevoked || row.isSystem;
        let revokeTitle = "Revoke API client";
        if (row.isSystem) revokeTitle = "System clients cannot be revoked";
        else if (row.isRevoked) revokeTitle = "Already revoked";

        return (
          <GridRowActions>
            <RowActionButton
              variant="danger"
              title={revokeTitle}
              disabled={revokeDisabled}
              onClick={() => handleRevoke(row)}
              icon={<FaTrash className="icon" />}
            />
          </GridRowActions>
        );
      },
    },
  ];

  return (
    <CustomThemeProvider>
      <div
        className="data-grid-wrap"
        style={{
          backgroundColor: "var(--bg-body)",
          padding: 10,
          borderRadius: 8,
        }}
      >
        <Grid
          gridId="applications"
          rows={rows}
          columns={columns}
          pageSizeOptions={[5, 10, 20, 50, 100]}
          paginationMode="client"
          paginationModel={{ page: appsGridPage, pageSize: appsPageSize }}
          onPaginationModelChange={(m) => {
            setAppsGridPage(m.page);
            setAppsPageSize(m.pageSize);
          }}
          slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
          localeText={{ noRowsLabel: "📭 No API clients registered" }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default ApplicationTable;
