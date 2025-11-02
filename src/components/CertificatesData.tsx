// src/pages/CertificatesData.tsx
// comments in English only
import React, { useMemo, useState } from "react";
import CertificatesTable from "../components/CertificatesTable";
import OvpnFilesTable from "../components/OvpnFilesTable";
import AddOvpnFile from "../components/AddOvpnFile";
import AddCertificate from "../components/AddCertificate";

import {
  useGetApiOpenVpnFilesGetAllVpnServerId,
} from "../api/orval/open-vpn-files/open-vpn-files";

import {
  useGetApiOpenVpnCertsVpnServerIdGetAll,
} from "../api/orval/open-vpn-server-certs/open-vpn-server-certs";

import type {
  GetAllCertificatesResponseApiResponse,
  OvpnFilesResponseApiResponse,
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

// helper: normalize different shapes safely
function pickArray(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.certificates)) return payload.certificates;
  if (Array.isArray(payload.ovpnFiles)) return payload.ovpnFiles;
  return [];
}

const CertificatesData: React.FC<Props> = ({ vpnServerId }) => {
  const numericId = useMemo(() => Number(vpnServerId), [vpnServerId]);
  const [selectedStatus, setSelectedStatus] = useState<CertificateStatus | null>(null);

  // OVPN files
  const filesQuery = useGetApiOpenVpnFilesGetAllVpnServerId(numericId, {
    query: {
      enabled: Number.isFinite(numericId),
      staleTime: 10_000,
      retry: 1,
      // react-query v5: no `keepPreviousData`; rely on caching via staleTime
    },
  });

  const ovpnFiles = pickArray(filesQuery.data as OvpnFilesResponseApiResponse);

  // Certificates
  const certsQuery = useGetApiOpenVpnCertsVpnServerIdGetAll(numericId, {
    query: {
      enabled: Number.isFinite(numericId),
      staleTime: 10_000,
      retry: 1,
    },
  });

  const allCertificates = pickArray(certsQuery.data as GetAllCertificatesResponseApiResponse);
  const certificates = selectedStatus === null
    ? allCertificates
    : allCertificates.filter((c: any) => c?.status === selectedStatus);

  return (
    <>
      {filesQuery.isError && (
        <p className="error-message">
          Failed to load OVPN files
          <br />
          {(filesQuery.error as any)?.message ?? ""}
        </p>
      )}

      <h3>Issued OVPN Files</h3>
      <h5>Make New OVPN File for Client</h5>
      <p className="certificate-description">
        Enter the <strong>Common Name (CN)</strong> and an <strong>External ID</strong> to generate a new OVPN file.
      </p>

      <AddOvpnFile vpnServerId={vpnServerId} onSuccess={() => filesQuery.refetch()} />
      <OvpnFilesTable
        ovpnFiles={ovpnFiles}
        vpnServerId={vpnServerId}
        onRevoke={() => filesQuery.refetch()}
        loading={filesQuery.isFetching}
      />

      {certsQuery.isError && (
        <p className="error-message">
          Failed to load certificates
          <br />
          {(certsQuery.error as any)?.message ?? ""}
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
              e.target.value === "" ? null : (Number(e.target.value) as CertificateStatus)
            )
          }
        >
          <option value="">All</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <h5>Add New Certificate</h5>
      <p className="certificate-description">
        Enter the <strong>Common Name (CN)</strong> for the new certificate and click "Add Certificate".
      </p>

      <AddCertificate vpnServerId={vpnServerId} onSuccess={() => certsQuery.refetch()} />
      <CertificatesTable
        certificates={certificates}
        vpnServerId={vpnServerId}
        onRevoke={() => certsQuery.refetch()}
        loading={certsQuery.isFetching}
      />
    </>
  );
};

export default CertificatesData;
