import React, { useCallback, useEffect, useState } from "react";
import CertificatesTable from "../components/CertificatesTable";
import AddCertificate from "../components/AddCertificate";
// import type { Certificate } from "../utils/types";
// import { CertificateStatus } from "../utils/types";

interface Props {
  vpnServerId: string;
}

const statusLabels: Record<CertificateStatus, string> = {
  [CertificateStatus.Active]: "Active",
  [CertificateStatus.Revoked]: "Revoked",
  [CertificateStatus.Expired]: "Expired",
  [CertificateStatus.Unknown]: "Unknown",
};

const CertificatesSection: React.FC<Props> = ({ vpnServerId }) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<CertificateStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [certError, setCertError] = useState<{ message: string; detail?: string } | null>(null);

  const fetchCerts = useCallback(async () => {
    try {
      const certs = await fetchCertificates(
        vpnServerId,
        selectedStatus !== null ? String(selectedStatus) : undefined
      );

      const validCerts = Array.isArray(certs)
        ? certs.filter(c => c.commonName && c.commonName.trim() !== "")
        : [];

      if (validCerts.length === 0) {
        setCertError({
          message: "No certificates found.",
          detail: "The server returned an empty or invalid certificate list.",
        });
      } else {
        setCertError(null);
      }

      setCertificates(validCerts);
    } catch (error: any) {
      console.error("Error fetching certificates", error);
      setCertificates([]);
      setCertError({
        message: error?.response?.data?.Message || "Failed to load certificates",
        detail: error?.response?.data?.Detail,
      });
    }
  }, [vpnServerId, selectedStatus]);

  const reload = useCallback(async () => {
    if (!vpnServerId) return;
    setLoading(true);
    setCertError(null);
    await Promise.allSettled([fetchCerts()]);
    setLoading(false);
  }, [vpnServerId, fetchCerts]);

  useEffect(() => {
    reload();
  }, [vpnServerId, selectedStatus, reload]);

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
            setSelectedStatus(e.target.value === "" ? null : (Number(e.target.value) as CertificateStatus))
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
        certificates={Array.isArray(certificates) ? certificates : []}
        vpnServerId={vpnServerId}
        onRevoke={reload}
        loading={loading}
      />
    </>
  );
};

export default CertificatesSection;
