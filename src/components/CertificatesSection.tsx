// src/sections/CertificatesSection.tsx
// comments in English only
import React, { useEffect, useMemo, useState } from "react";
import CertificatesTable from "../components/CertificatesTable";
import AddCertificate from "../components/AddCertificate";

// orval
import {
  useGetApiOpenVpnCertsVpnServerIdGetAll,
} from "../api/orval/open-vpn-server-certs/open-vpn-server-certs";
import type {
  GetAllCertificatesResponse,
  ServerCertificate,
  CertificateStatus, // enum: 0=Valid, 1=Revoked, 2=Expired, 3=Unknown
} from "../api/orval/model";

interface Props {
  vpnServerId: string;
}

const statusLabels: Record<number, string> = {
  0: "Valid",
  1: "Revoked",
  2: "Expired",
  3: "Unknown",
};

const CertificatesSection: React.FC<Props> = ({ vpnServerId }) => {
  const [selectedStatus, setSelectedStatus] = useState<CertificateStatus | null>(null);
  const [certError, setCertError] = useState<{ message: string; detail?: string } | null>(null);

  const numericId = Number(vpnServerId);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useGetApiOpenVpnCertsVpnServerIdGetAll(numericId, {
    query: {
      enabled: Number.isFinite(numericId) && numericId > 0,
      refetchOnWindowFocus: false,
    },
  });

  // Safely extract array from unwrapped response
  const rawCerts: ServerCertificate[] = useMemo(() => {
    const payload: GetAllCertificatesResponse | undefined = data as GetAllCertificatesResponse | undefined;
    const arr = payload?.serverCertificates ?? null;
    return Array.isArray(arr) ? arr : [];
  }, [data]);

  // Apply UI filters
  const certificates: ServerCertificate[] = useMemo(() => {
    const filtered =
      selectedStatus === null
        ? rawCerts
        : rawCerts.filter(c => c.status === selectedStatus);

    return filtered.filter(c => typeof c.commonName === "string" && c.commonName.trim() !== "");
  }, [rawCerts, selectedStatus]);

  // Derive UI error from query state + empty result
  useEffect(() => {
    if (error) {
      const anyErr: any = error as any;
      setCertError({
        message:
          anyErr?.response?.data?.Message ||
          anyErr?.message ||
          "Failed to load certificates",
        detail: anyErr?.response?.data?.Detail,
      });
      return;
    }

    if (!isLoading && certificates.length === 0) {
      setCertError({
        message: "No certificates found.",
        detail: "The server returned an empty or invalid certificate list.",
      });
    } else {
      setCertError(null);
    }
  }, [error, isLoading, certificates.length]);

  const reload = () => refetch();

  return (
    <>
      {certError && (
        <p className="error-message">
          {certError.message}
          <br />
          {certError.detail}
        </p>
      )}

      <h3>Certificates</h3>
      <h5>Filter by Certificate Status</h5>

      <div className="settings-item">
        <select
          className="input"
          value={selectedStatus ?? ""}
          onChange={(e) =>
            setSelectedStatus(
              e.target.value === "" ? null : (Number(e.target.value) as CertificateStatus),
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

      <AddCertificate vpnServerId={vpnServerId} onSuccess={reload} />

      <CertificatesTable
        certificates={certificates}
        vpnServerId={vpnServerId}
        onRevoke={reload}
        loading={isLoading}
      />
    </>
  );
};

export default CertificatesSection;