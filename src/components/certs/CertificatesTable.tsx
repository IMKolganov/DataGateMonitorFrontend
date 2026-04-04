// src/components/CertificatesTable.tsx
import React, { useState, useCallback } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../ui/TableStyle.tsx";
import CustomThemeProvider from "../ui/ThemeProvider.tsx";
import type {
  MonitorServerCertificate as Certificate,
  RevokeCertificateRequest,
} from "../../api/orval/model";
import { postApiOpenVpnCertsRevoke } from "../../api/orval/open-vpn-server-certs/open-vpn-server-certs.ts";
import "../../css/Table.css";
import { toast } from "react-toastify";
import { formatDateWithOffset } from "../../utils/utils.ts";
import axios from "axios";
import { axiosResponseDataMessage, errorMessage } from "../../utils/errorMessage";

type CertificatesTableProps = {
  certificates: Certificate[];
  vpnServerId: string | number;
  onRevoke: () => Promise<void> | void;
  loading?: boolean;
};

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

  const handleRevoke = useCallback(
    async (commonName: string) => {
      if (!window.confirm(`Are you sure you want to revoke certificate for ${commonName}?`)) return;

      try {
        setRevokingCN(commonName);
        await revokeCertificate(vpnServerId, commonName);
        // success toast is handled by parent
        await onRevoke();
      } catch (error: unknown) {
        const data = axios.isAxiosError(error) ? error.response?.data : undefined;
        const msg =
          axiosResponseDataMessage(data) ??
          (axios.isAxiosError(error) ? error.message : undefined) ??
          errorMessage(error) ??
          "Failed to revoke certificate.";
        toast.error(msg);
      } finally {
        setRevokingCN(null);
      }
    },
    [vpnServerId, onRevoke],
  );

  const filteredCertificates = certificates.filter((cert) => {
    const name = cert.commonName?.toLowerCase() || "";
    const serial = cert.serialNumber?.toLowerCase() || "";
    const status = cert.status?.toString() ?? "";

    return (
      name.includes(searchQuery.toLowerCase()) &&
      (selectedStatus === "" || status === selectedStatus) &&
      serial.includes(serialNumberQuery.toLowerCase())
    );
  });

  const rows = filteredCertificates.map((cert, index) => {
    const statusNumeric = typeof cert.status === "number" ? cert.status : 3;
    return {
      id: index + 1,
      commonName: cert.commonName || "N/A",
      status: statusNumeric,
      statusText: renderStatus(statusNumeric),
      expiryDate: cert.expiryDate ? formatDateWithOffset(new Date(cert.expiryDate)) : "N/A",
      revokeDate: cert.revokeDate ? formatDateWithOffset(new Date(cert.revokeDate)) : "N/A",
      serialNumber: cert.serialNumber || "N/A",
    };
  });

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

        const cn = params.row.commonName as string;

        return (
          <div className="action-container">
            <button
              className="btn danger"
              onClick={() => handleRevoke(cn)}
              disabled={loading || revokingCN === cn}
              title={revokingCN === cn ? "Revoking..." : "Revoke"}
            >
              {revokingCN === cn ? "Revoking..." : "Revoke"}
            </button>
          </div>
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
            type="text"
            placeholder="Search by Common Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
          <select
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
          localeText={{
            noRowsLabel: loading ? "🔄 Loading certificates..." : "📭 No certificates found",
          }}
          loading={loading}
          slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default CertificatesTable;