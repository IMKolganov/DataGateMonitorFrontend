import React, { useEffect, useState, useCallback } from "react";
import { fetchCertificates, fetchOvpnFiles } from "../utils/api";
import CertificatesTable from "../components/CertificatesTable";
import OvpnFilesTable from "../components/OvpnFilesTable";
import { Certificate, CertificateStatus } from "../utils/types";
import AddOvpnFile from "../components/AddOvpnFile";
import AddCertificate from "../components/AddCertificate";

interface Props {
  vpnServerId: string;
}

const CertificatesData: React.FC<Props> = ({ vpnServerId }) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [ovpnFiles, setOvpnFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<CertificateStatus | null>(null);

  const fetchData = useCallback(async () => {
    if (!vpnServerId) return;
    setLoading(true);
    setError(null);

    try {
      const certs = await fetchCertificates(vpnServerId, selectedStatus !== null ? String(selectedStatus) : undefined);
      const ovpnFilesList = await fetchOvpnFiles(vpnServerId);
      setCertificates(certs);
      setOvpnFiles(ovpnFilesList);
    } catch (error: any) {
      console.error("Error fetching certificates or OVPN files", error);
      setError({
        message: error.response?.data?.Message || "Failed to load data",
        detail: error.response?.data?.Detail,
      });
    } finally {
      setLoading(false);
    }
  }, [vpnServerId, selectedStatus]);

  useEffect(() => {
    fetchData();
  }, [vpnServerId, selectedStatus]);

  return (
    <>
      <h3>Issued OVPN Files</h3>
      <h5>Make New OVPN File for Client</h5>
      <p className="certificate-description">
        Enter the <strong>Common Name (CN)</strong> and an <strong>External ID</strong> to generate a new OVPN file.
      </p>

      <AddOvpnFile vpnServerId={vpnServerId} onSuccess={fetchData} />
      <OvpnFilesTable ovpnFiles={ovpnFiles} vpnServerId={vpnServerId} onRevoke={fetchData} loading={loading} />

      <h3>Certificates</h3>
      <h5>Add New Certificate</h5>
      <p className="certificate-description">
        Enter the <strong>Common Name (CN)</strong> for the new certificate and click "Add Certificate".
      </p>
      <AddCertificate vpnServerId={vpnServerId} onSuccess={fetchData} />
      <CertificatesTable certificates={certificates} vpnServerId={vpnServerId} onRevoke={fetchData} loading={loading} />
    </>
  );
};

export default CertificatesData;
