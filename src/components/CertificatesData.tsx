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
  const [certError, setCertError] = useState<{ message: string; detail?: string } | null>(null);
  const [ovpnError, setOvpnError] = useState<{ message: string; detail?: string } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<CertificateStatus | null>(null);

  const fetchCerts = useCallback(async () => {
    try {
      const certs = await fetchCertificates(
        vpnServerId,
        selectedStatus !== null ? String(selectedStatus) : undefined
      );
  
      if (!certs || certs.length === 0) {
        setCertError({
          message: "No certificates found.",
          detail: "The server returned an empty list of certificates.",
        });
      } else {
        setCertificates(certs);
        setCertError(null);
      }
    } catch (error: any) {
      console.error("Error fetching certificates", error);
      setCertError({
        message: error.response?.data?.Message || "Failed to load certificates",
        detail: error.response?.data?.Detail,
      });
    }
  }, [vpnServerId, selectedStatus]);
  
  const fetchOvpn = useCallback(async () => {
    try {
      const response = await fetchOvpnFiles(vpnServerId);
      const data = response?.data;
  
      if (!Array.isArray(data) || data.length === 0) {
        setOvpnError({
          message: "No OVPN files found.",
          detail: "The server returned an empty list of OVPN files.",
        });
        setOvpnFiles([]);
      } else {
        setOvpnFiles(data);
        setOvpnError(null);
      }
    } catch (error: any) {
      console.error("Error fetching OVPN files", error);
      setOvpnError({
        message: error.response?.data?.Message || "Failed to load OVPN files",
        detail: error.response?.data?.Detail,
      });
      setOvpnFiles([]);
    }
  }, [vpnServerId]);  

  const fetchData = useCallback(async () => {
    if (!vpnServerId) return;
    setLoading(true);
    setCertError(null);
    setOvpnError(null);

    await Promise.allSettled([fetchCerts(), fetchOvpn()]);

    setLoading(false);
  }, [vpnServerId, fetchCerts, fetchOvpn]);

  useEffect(() => {
    fetchData();
  }, [vpnServerId, selectedStatus]);

  return (
    <>
      {ovpnError && (
        <p className="error-message">{ovpnError.message}<br />{ovpnError.detail}</p>
      )}

      <h3>Issued OVPN Files</h3>
      <h5>Make New OVPN File for Client</h5>
      <p className="certificate-description">
        Enter the <strong>Common Name (CN)</strong> and an <strong>External ID</strong> to generate a new OVPN file.
      </p>

      <AddOvpnFile vpnServerId={vpnServerId} onSuccess={fetchData} />
      <OvpnFilesTable ovpnFiles={ovpnFiles} vpnServerId={vpnServerId} onRevoke={fetchData} loading={loading} />

      {certError && (
        <p className="error-message">{certError.message}<br />{certError.detail}</p>
      )}

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