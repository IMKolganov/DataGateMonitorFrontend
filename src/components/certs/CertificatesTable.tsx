// src/components/CertificatesTable.tsx
import React, { useState, useCallback, useMemo } from "react";
import type { GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import Grid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import type {
  MonitorServerCertificate as Certificate,
  RevokeCertificateRequest,
} from "../../api/orvalModelShim";
import { postApiOpenVpnCertsRevoke } from "../../api/orval/vpn-server-certs/vpn-server-certs.ts";
import { FaBan } from "react-icons/fa";
import "../../css/Table.css";
import { toast } from "react-toastify";
import { formatDateWithOffset } from "../../utils/utils.ts";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize";
import axios from "axios";
import { axiosResponseDataMessage, errorMessage } from "../../utils/errorMessage";
import { GridRowActions, RowActionButton } from "../ui/GridRowActions.tsx";
import {
  collectSelectedOnPage,
  emptyGridSelection,
  slicePageRows,
} from "../../utils/gridPageSelection";

type CertificatesTableProps = {
  certificates: Certificate[];
  vpnServerId: string | number;
  onRevoke: (count?: number) => Promise<void> | void;
  loading?: boolean;
};

const ACTIVE_STATUS = 0;

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

async function revokeCertificate(vpnServerId: string | number, commonName: string) {
  const req: RevokeCertificateRequest = {
    vpnServerId: Number(vpnServerId),
    commonName,
  };
  await postApiOpenVpnCertsRevoke(req);
}

function formatRevokeError(error: unknown): string {
  const data = axios.isAxiosError(error) ? error.response?.data : undefined;
  return (
    axiosResponseDataMessage(data) ??
    (axios.isAxiosError(error) ? error.message : undefined) ??
    errorMessage(error) ??
    "Failed to revoke certificate."
  );
}

const CertificatesTable: React.FC<CertificatesTableProps> = ({
  certificates = [],
  vpnServerId,
  onRevoke,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [serialNumberQuery, setSerialNumberQuery] = useState("");
  const [revokingCN, setRevokingCN] = useState<string | null>(null);
  const [bulkRevoking, setBulkRevoking] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>(emptyGridSelection);
  const [certsGridPage, setCertsGridPage] = useState(0);
  const [certsPageSize, setCertsPageSize] = usePersistedPageSize(
    `certs:${vpnServerId}`,
    10,
    "5,10,20,100",
  );

  const filteredCertificates = useMemo(
    () =>
      certificates.filter((cert) => {
        const name = cert.commonName?.toLowerCase() || "";
        const serial = cert.serialNumber?.toLowerCase() || "";
        const status = cert.status?.toString() ?? "";

        return (
          name.includes(searchQuery.toLowerCase()) &&
          (selectedStatus === "" || status === selectedStatus) &&
          serial.includes(serialNumberQuery.toLowerCase())
        );
      }),
    [certificates, searchQuery, selectedStatus, serialNumberQuery],
  );

  // Drop stale selection when filters, page, or server change.
  React.useEffect(() => {
    setRowSelectionModel(emptyGridSelection());
  }, [searchQuery, selectedStatus, serialNumberQuery, certsGridPage, certsPageSize, vpnServerId]);

  const rows = useMemo(
    () =>
      filteredCertificates.map((cert, index) => {
        const statusNumeric = typeof cert.status === "number" ? cert.status : 3;
        const commonName = cert.commonName || "N/A";
        const serialNumber = cert.serialNumber || "N/A";
        const id =
          cert.commonName?.trim() ||
          cert.serialNumber?.trim() ||
          `cert-row-${index}`;
        return {
          id,
          commonName,
          status: statusNumeric,
          statusText: renderStatus(statusNumeric),
          expiryDate: cert.expiryDate ? formatDateWithOffset(new Date(cert.expiryDate)) : "N/A",
          revokeDate: cert.revokeDate ? formatDateWithOffset(new Date(cert.revokeDate)) : "N/A",
          serialNumber,
        };
      }),
    [filteredCertificates],
  );

  const pageRows = useMemo(
    () => slicePageRows(rows, certsGridPage, certsPageSize),
    [rows, certsGridPage, certsPageSize],
  );

  const selectedActiveCommonNames = useMemo(
    () =>
      collectSelectedOnPage(rowSelectionModel, pageRows, (row) => row.status === ACTIVE_STATUS).map(
        (row) => row.commonName,
      ),
    [rowSelectionModel, pageRows],
  );

  const clearSelection = useCallback(() => setRowSelectionModel(emptyGridSelection()), []);

  const handleRevokeMany = useCallback(
    async (commonNames: string[]) => {
      const unique = [...new Set(commonNames.filter((cn) => cn && cn !== "N/A"))];
      if (unique.length === 0) return;

      const preview =
        unique.length <= 5
          ? unique.join(", ")
          : `${unique.slice(0, 3).join(", ")} and ${unique.length - 3} more`;
      const confirmed = window.confirm(
        unique.length === 1
          ? `Are you sure you want to revoke certificate for ${unique[0]}?`
          : `Are you sure you want to revoke ${unique.length} certificates?\n\n${preview}\n\nThis cannot be undone.`,
      );
      if (!confirmed) return;

      setBulkRevoking(true);
      try {
        const failures: string[] = [];
        for (const commonName of unique) {
          try {
            setRevokingCN(commonName);
            await revokeCertificate(vpnServerId, commonName);
          } catch (error: unknown) {
            failures.push(`${commonName}: ${formatRevokeError(error)}`);
          }
        }

        const succeeded = unique.length - failures.length;
        clearSelection();

        if (succeeded > 0) {
          await onRevoke(succeeded);
        }
        if (failures.length > 0) {
          toast.error(
            failures.length === 1
              ? failures[0]
              : `Failed to revoke ${failures.length} of ${unique.length} certificates.`,
          );
        }
      } finally {
        setRevokingCN(null);
        setBulkRevoking(false);
      }
    },
    [vpnServerId, onRevoke, clearSelection],
  );

  const handleRevoke = useCallback(
    async (commonName: string) => {
      await handleRevokeMany([commonName]);
    },
    [handleRevokeMany],
  );

  const handleBulkRevoke = useCallback(async () => {
    await handleRevokeMany(selectedActiveCommonNames);
  }, [handleRevokeMany, selectedActiveCommonNames]);

  const busy = loading || bulkRevoking;

  const columns: GridColDef[] = [
    { field: "commonName", headerName: "Common Name", flex: 1 },
    { field: "statusText", headerName: "Status", flex: 1 },
    { field: "expiryDate", headerName: "Expiry Date", flex: 1 },
    { field: "revokeDate", headerName: "Revoke Date", flex: 1 },
    { field: "serialNumber", headerName: "Serial Number", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        if (params.row.status !== ACTIVE_STATUS) {
          return null;
        }

        const cn = params.row.commonName as string;
        const isRevoking = revokingCN === cn;

        return (
          <GridRowActions>
            <RowActionButton
              variant="danger"
              title={isRevoking ? "Revoking..." : "Revoke"}
              disabled={busy}
              onClick={() => handleRevoke(cn)}
              icon={<FaBan className="icon" />}
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
          padding: "10px",
          borderRadius: "8px",
        }}
      >
        <div className="filters">
          <input
            id="certificates-search-common-name"
            name="certificateSearchCommonName"
            type="text"
            placeholder="Search by Common Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
          <select
            id="certificates-search-status"
            name="certificateSearchStatus"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input"
          >
            <option value="">All Statuses</option>
            <option value="0">✅ Active</option>
            <option value="1">❌ Revoked</option>
            <option value="2">⌛ Expired</option>
            <option value="3">❓ Unknown</option>
          </select>
          <input
            id="certificates-search-serial"
            name="certificateSearchSerial"
            type="text"
            placeholder="Search by Serial Number"
            value={serialNumberQuery}
            onChange={(e) => setSerialNumberQuery(e.target.value)}
            className="input"
          />
          <button
            type="button"
            className="btn danger"
            disabled={busy || selectedActiveCommonNames.length === 0}
            onClick={() => void handleBulkRevoke()}
            title={
              selectedActiveCommonNames.length === 0
                ? "Select active certificates to revoke"
                : `Revoke ${selectedActiveCommonNames.length} selected`
            }
          >
            <FaBan className="icon" aria-hidden />
            {bulkRevoking
              ? "Revoking…"
              : selectedActiveCommonNames.length > 0
                ? `Revoke selected (${selectedActiveCommonNames.length})`
                : "Revoke selected"}
          </button>
        </div>
        <Grid
          gridId="certificates"
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          checkboxSelection
          disableRowSelectionOnClick
          disableRowSelectionExcludeModel
          isRowSelectable={(params) => params.row.status === ACTIVE_STATUS}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={(model) => setRowSelectionModel(model)}
          pageSizeOptions={[5, 10, 20, 100]}
          paginationMode="client"
          paginationModel={{ page: certsGridPage, pageSize: certsPageSize }}
          onPaginationModelChange={(m) => {
            setCertsGridPage(m.page);
            setCertsPageSize(m.pageSize);
          }}
          localeText={{
            noRowsLabel: loading ? "🔄 Loading certificates..." : "📭 No certificates found",
          }}
          loading={busy}
          slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default CertificatesTable;
