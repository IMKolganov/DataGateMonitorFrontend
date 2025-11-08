// src/components/CertificatesData.tsx
import React, { useEffect, useMemo, useState } from "react";
import CertificatesTable from "../components/CertificatesTable";
import OvpnFilesTable from "../components/OvpnFilesTable";
import AddOvpnFile from "../components/AddOvpnFile";
import AddCertificate from "../components/AddCertificate";
import { toast } from "react-toastify";

import {
  useGetApiOpenVpnFilesGetAllVpnServerId,
} from "../api/orval/open-vpn-files/open-vpn-files";

import {
  useGetApiOpenVpnCertsVpnServerIdGetAll,
} from "../api/orval/open-vpn-server-certs/open-vpn-server-certs";

import type {
  GetAllCertificatesResponse,
  OvpnFilesResponse,
} from "../api/orval/model";

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
  const anyErr = err as any;
  if (anyErr?.response?.data) {
    const data = anyErr.response.data;
    if (typeof data === "string") return data;
    if (typeof data?.message === "string") return data.message;
    if (typeof data?.title === "string") return data.title;
    if (Array.isArray(data?.errors)) return data.errors.join(", ");
  }
  if (typeof anyErr?.message === "string") return anyErr.message;
  try {
    return JSON.stringify(anyErr);
  } catch {
    return "Unknown error";
  }
}

// Normalize different shapes safely
function pickArray(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  if (payload?.data && !Array.isArray(payload.data)) {
    const nested = pickArray(payload.data);
    if (nested.length) return nested;
  }

  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.ovpnFiles)) return payload.ovpnFiles;
  if (Array.isArray(payload.issuedOvpnFile)) return payload.issuedOvpnFile;
  if (Array.isArray(payload.issuedOvpnFiles)) return payload.issuedOvpnFiles;

  if (Array.isArray(payload.serverCertificates)) return payload.serverCertificates;
  if (Array.isArray(payload.certificates)) return payload.certificates;
  if (Array.isArray(payload.monitorServerCertificates)) return payload.monitorServerCertificates;

  if (typeof payload === "object") {
    for (const k of Object.keys(payload)) {
      const v = (payload as any)[k];
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

  const ovpnFiles = pickArray(filesQuery.data as OvpnFilesResponse);
  const allCertificates = pickArray(certsQuery.data as GetAllCertificatesResponse);
  const certificates =
    selectedStatus === null
      ? allCertificates
      : allCertificates.filter((c: any) => c?.status === selectedStatus);

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
        render({ data }) {
          const err = (data as any)?.error ?? data;
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
        render({ data }) {
          const err = (data as any)?.error ?? data;
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
