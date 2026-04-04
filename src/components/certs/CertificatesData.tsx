// src/components/CertificatesData.tsx
import React, { useEffect, useMemo, useState } from "react";
import CertificatesTable from "./CertificatesTable.tsx";
import OvpnFilesTable, { type OvpnRowInput } from "../ovpn-files/OvpnFilesTable.tsx";
import AddOvpnFile from "../ovpn-files/AddOvpnFile.tsx";
import AddCertificate from "./AddCertificate.tsx";
import { toast } from "react-toastify";

import {
  useGetApiOpenVpnFilesGetAllVpnServerId,
} from "../../api/orval/open-vpn-files/open-vpn-files.ts";

import {
  useGetApiOpenVpnCertsVpnServerIdGetAll,
} from "../../api/orval/open-vpn-server-certs/open-vpn-server-certs.ts";

import type {
  GetAllCertificatesResponse,
  MonitorServerCertificate,
  OvpnFilesResponse,
} from "../../api/orval/model";
import axios from "axios";
import { errorMessage as baseErrorMessage } from "../../utils/errorMessage";

interface Props {
  vpnServerId: string;
}

enum CertificateStatus {
  Active = 0,
  Revoked = 1,
  Expired = 2,
  Unknown = 3,
}

const statusLabels: Record<CertificateStatus, string> = {
  [CertificateStatus.Active]: "Active",
  [CertificateStatus.Revoked]: "Revoked",
  [CertificateStatus.Expired]: "Expired",
  [CertificateStatus.Unknown]: "Unknown",
};

// Safe error extractor
function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data !== undefined) {
    const data = err.response.data;
    if (typeof data === "string") return data;
    if (typeof data === "object" && data !== null) {
      const r = data as Record<string, unknown>;
      const msg = r["message"] ?? r["title"];
      if (typeof msg === "string") return msg;
      const errors = r["errors"];
      if (Array.isArray(errors)) return errors.map(String).join(", ");
    }
  }
  return baseErrorMessage(err);
}

// Normalize different shapes safely
function pickArray(payload: unknown): unknown[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const p = payload as Record<string, unknown>;

  if (p["data"] != null && !Array.isArray(p["data"])) {
    const nested = pickArray(p["data"]);
    if (nested.length) return nested;
  }

  if (Array.isArray(p["data"])) return p["data"];
  if (Array.isArray(p["items"])) return p["items"];
  if (Array.isArray(p["ovpnFiles"])) return p["ovpnFiles"];
  if (Array.isArray(p["issuedOvpnFile"])) return p["issuedOvpnFile"];
  if (Array.isArray(p["issuedOvpnFiles"])) return p["issuedOvpnFiles"];

  if (Array.isArray(p["serverCertificates"])) return p["serverCertificates"];
  if (Array.isArray(p["certificates"])) return p["certificates"];
  if (Array.isArray(p["monitorServerCertificates"])) return p["monitorServerCertificates"];

  if (typeof payload === "object" && payload !== null) {
    for (const k of Object.keys(p)) {
      const v = p[k];
      if (Array.isArray(v)) return v;
    }
  }

  return [];
}

const CertificatesData: React.FC<Props> = ({ vpnServerId }) => {
  const numericId = useMemo(() => Number(vpnServerId), [vpnServerId]);
  const isValidId = Number.isFinite(numericId) && numericId > 0;

  const [selectedStatus, setSelectedStatus] = useState<CertificateStatus | null>(null);

  // Queries
  const filesQuery = useGetApiOpenVpnFilesGetAllVpnServerId(
    isValidId ? numericId : (undefined as unknown as number),
    {
      query: { enabled: isValidId, staleTime: 10_000, retry: 1 },
    },
  );

  const certsQuery = useGetApiOpenVpnCertsVpnServerIdGetAll(
    isValidId ? numericId : (undefined as unknown as number),
    {
      query: { enabled: isValidId, staleTime: 10_000, retry: 1 },
    },
  );

  const ovpnFiles = pickArray(filesQuery.data as OvpnFilesResponse) as OvpnRowInput[];
  const allCertificates = pickArray(certsQuery.data as GetAllCertificatesResponse) as MonitorServerCertificate[];
  const certificates: MonitorServerCertificate[] =
    selectedStatus === null
      ? allCertificates
      : allCertificates.filter((c) => c?.status === selectedStatus);

  // Toasts for invalid server id
  useEffect(() => {
    if (!isValidId) {
      toast.warn("VPN Server ID is missing or invalid", { toastId: "vpn-id-warn" });
    }
  }, [isValidId]);

  // Toasts for query errors
  useEffect(() => {
    if (filesQuery.isError) {
      toast.error(`Failed to load OVPN files: ${getErrorMessage(filesQuery.error)}`, {
        toastId: "files-load-error",
      });
    }
  }, [filesQuery.isError, filesQuery.error]);

  useEffect(() => {
    if (certsQuery.isError) {
      toast.error(`Failed to load certificates: ${getErrorMessage(certsQuery.error)}`, {
        toastId: "certs-load-error",
      });
    }
  }, [certsQuery.isError, certsQuery.error]);

  // Helpers
  const refetchFiles = async () =>
    toast.promise(filesQuery.refetch(), {
      pending: "Refreshing OVPN files…",
      success: "OVPN files are up to date",
      error: {
        render({ data }: { data?: unknown }) {
          const err =
            data && typeof data === "object" && data !== null && "error" in data
              ? (data as { error: unknown }).error
              : data;
          return `Failed to refresh OVPN files: ${getErrorMessage(err)}`;
        },
      },
    });

  const silentRefetchFiles = async () => {
    try {
      await filesQuery.refetch();
    } catch (e) {
      toast.error(`Failed to refresh OVPN files: ${getErrorMessage(e)}`, {
        toastId: "files-refetch-error",
      });
    }
  };

  const refetchCerts = async () =>
    toast.promise(certsQuery.refetch(), {
      pending: "Refreshing certificates…",
      success: "Certificates are up to date",
      error: {
        render({ data }: { data?: unknown }) {
          const err =
            data && typeof data === "object" && data !== null && "error" in data
              ? (data as { error: unknown }).error
              : data;
          return `Failed to refresh certificates: ${getErrorMessage(err)}`;
        },
      },
    });

  // Silent refetch for certificates to avoid duplicate toasts after revoke
  const silentRefetchCerts = async () => {
    try {
      await certsQuery.refetch();
    } catch (e) {
      toast.error(`Failed to refresh certificates: ${getErrorMessage(e)}`, {
        toastId: "certs-refetch-error",
      });
    }
  };

  return (
    <>
      <h3>Issued OVPN Files</h3>
      <h5>Make New OVPN File for Client</h5>
      <p className="certificate-description">
        Enter the <strong>Common Name (CN)</strong> and an <strong>External ID</strong> to generate a new OVPN file.
      </p>

      <AddOvpnFile
        vpnServerId={vpnServerId}
        onSuccess={async () => {
          toast.success("OVPN file created");
          await refetchFiles();
        }}
      />

      <OvpnFilesTable
        ovpnFiles={ovpnFiles}
        vpnServerId={vpnServerId}
        loading={filesQuery.isFetching}
        onRevoke={async () => {
          toast.success("OVPN file revoked", { toastId: "ovpn-revoked" });
          await silentRefetchFiles();
        }}
      />

      <h3>Certificates</h3>
      <h5>Filter by Certificate Status</h5>
      <div className="settings-item">
        <select
          className="input"
          value={selectedStatus ?? ""}
          onChange={(e) =>
            setSelectedStatus(
              e.target.value === ""
                ? null
                : (Number(e.target.value) as CertificateStatus),
            )
          }
        >
          <option value="">All</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <h5>Add New Certificate</h5>
      <p className="certificate-description">
        Enter the <strong>Common Name (CN)</strong> for the new certificate and click "Add Certificate".
      </p>

      <AddCertificate
        vpnServerId={vpnServerId}
        onSuccess={async () => {
          toast.success("Certificate added");
          await refetchCerts();
        }}
      />

      <CertificatesTable
        certificates={certificates}
        vpnServerId={vpnServerId}
        loading={certsQuery.isFetching}
        onRevoke={async () => {
          // single success toast on revoke + silent refetch (no duplicate toasts)
          toast.success("Certificate revoked", { toastId: "cert-revoked" });
          await silentRefetchCerts();
        }}
      />
    </>
  );
};

export default CertificatesData;
