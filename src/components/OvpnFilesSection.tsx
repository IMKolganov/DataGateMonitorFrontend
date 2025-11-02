// src/sections/OvpnFilesSection.tsx
import React, { useCallback, useEffect, useState } from "react";
import OvpnFilesTable from "../components/OvpnFilesTable";
import AddOvpnFile from "../components/AddOvpnFile";

interface Props {
  vpnServerId: string;
  externalId?: string; // optional: when provided, fetch by externalId
  isRevoked?: boolean; // optional filter, default false
}

const OvpnFilesSection: React.FC<Props> = ({ vpnServerId, externalId, isRevoked = false }) => {
  const [ovpnFiles, setOvpnFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ovpnError, setOvpnError] = useState<{ message: string; detail?: string } | null>(null);

  const fetchOvpn = useCallback(async () => {
    // Decide which API to call based on presence of externalId
    const loader = externalId
      ? () => fetchOvpnFilesByExternalId(vpnServerId, externalId, isRevoked)
      : () => fetchOvpnFiles(vpnServerId);

    try {
      const response = await loader();
      const data = Array.isArray(response) ? response : [];
      setOvpnFiles(data);
      setOvpnError(null);
    } catch (error: any) {
      console.error("Error fetching OVPN files", error);
      setOvpnFiles([]);
      setOvpnError({
        message: error?.response?.data?.Message || "Failed to load OVPN files",
        detail: error?.response?.data?.Detail,
      });
    }
  }, [vpnServerId, externalId, isRevoked]);

  const reload = useCallback(async () => {
    if (!vpnServerId) return;
    if (externalId !== undefined && externalId.trim() === "") return; // avoid empty externalId
    setLoading(true);
    setOvpnError(null);
    await Promise.allSettled([fetchOvpn()]);
    setLoading(false);
  }, [vpnServerId, externalId, fetchOvpn]);

  useEffect(() => {
    reload();
  }, [vpnServerId, externalId, isRevoked, reload]);

  return (
    <>
      {ovpnError && (
        <p className="error-message">
          {ovpnError.message}
          <br />
          {ovpnError.detail}
        </p>
      )}

      <h3>
        Issued OVPN Files{" "}
        {externalId ? (
          <small>(filtered by External ID: <code>{externalId}</code>, revoked: {String(isRevoked)})</small>
        ) : (
          <small>(server: <code>{vpnServerId}</code>)</small>
        )}
      </h3>

      <h5>Make New OVPN File for Client</h5>
      <p className="certificate-description">
        Enter the <strong>Common Name (CN)</strong> and an <strong>External ID</strong> to generate a new OVPN file.
      </p>

      <AddOvpnFile vpnServerId={vpnServerId} onSuccess={reload} />

      <OvpnFilesTable
        ovpnFiles={Array.isArray(ovpnFiles) ? ovpnFiles : []}
        vpnServerId={vpnServerId}
        onRevoke={reload}
        loading={loading}
      />
    </>
  );
};

export default OvpnFilesSection;
