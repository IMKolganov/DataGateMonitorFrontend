// src/components/certs/CertificatesData.tsx
import React, { useEffect, useMemo, useState } from "react";
import { FaCertificate, FaFilter, FaPlus } from "react-icons/fa";
import CertificatesTable from "./CertificatesTable.tsx";
import AddCertificate from "./AddCertificate.tsx";
import OpenVpnIssuedFilesSection from "./OpenVpnIssuedFilesSection.tsx";
import XrayClientLinksSection from "./XrayClientLinksSection.tsx";
import { toast } from "react-toastify";

import {
  useGetApiOpenVpnCertsVpnServerIdGetAll,
} from "../../api/orval/vpn-server-certs/vpn-server-certs.ts";

import type {
  GetAllCertificatesResponse,
  MonitorServerCertificate,
} from "../../api/orvalModelShim";
import axios from "axios";
import { errorMessage as baseErrorMessage } from "../../utils/errorMessage";
import { isHttpForbidden } from "../../utils/httpError";
import { ServerAccessDenied } from "../ServerAccessDenied";
import { pickArray } from "../../utils/pickPayloadArray.ts";
import "../../css/Settings.css";
import "../../css/ServerDetails.css";

interface Props {
  vpnServerId: string;
  stack?: "openvpn" | "xray";
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

const CertificatesData: React.FC<Props> = ({ vpnServerId, stack = "openvpn" }) => {
  const numericId = useMemo(() => Number(vpnServerId), [vpnServerId]);
  const isValidId = Number.isFinite(numericId) && numericId > 0;
  const isXrayStack = stack === "xray";

  const [selectedStatus, setSelectedStatus] = useState<CertificateStatus | null>(null);

  const certsQuery = useGetApiOpenVpnCertsVpnServerIdGetAll(
    isValidId ? numericId : (undefined as unknown as number),
    {
      query: { enabled: isValidId, staleTime: 10_000, retry: 1 },
    },
  );

  const allCertificates = pickArray(certsQuery.data as GetAllCertificatesResponse) as MonitorServerCertificate[];
  const certificates: MonitorServerCertificate[] =
    selectedStatus === null
      ? allCertificates
      : allCertificates.filter((c) => c?.status === selectedStatus);

  useEffect(() => {
    if (!isValidId) {
      toast.warn("VPN Server ID is missing or invalid", { toastId: "vpn-id-warn" });
    }
  }, [isValidId]);

  const certsAccessDenied = isValidId && certsQuery.isError && isHttpForbidden(certsQuery.error);

  useEffect(() => {
    if (certsQuery.isError && !isHttpForbidden(certsQuery.error)) {
      toast.error(`Failed to load certificates: ${getErrorMessage(certsQuery.error)}`, {
        toastId: "certs-load-error",
      });
    }
  }, [certsQuery.isError, certsQuery.error]);

  if (certsAccessDenied) {
    return <ServerAccessDenied />;
  }

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
    <div className="certificates-page__content">
      {isXrayStack ? (
        <XrayClientLinksSection vpnServerId={vpnServerId} />
      ) : (
        <OpenVpnIssuedFilesSection vpnServerId={vpnServerId} />
      )}

      <section
        className="certificates-page__section server-details__panel"
        aria-labelledby="certificates-list-heading"
      >
        <h3 id="certificates-list-heading" className="settings-card__h3-with-icon">
          <FaCertificate className="icon" aria-hidden />
          <span>{isXrayStack ? "Xray user certificates" : "Certificates"}</span>
        </h3>

        {isXrayStack ? (
          <p className="certificate-description certificates-page__add-block-desc" style={{ marginBottom: 12 }}>
            Optional: manage standalone certs on the node. Issuing a <strong>client link</strong> above also creates a
            user certificate via DataGateXRayManager.
          </p>
        ) : null}

        <div className="certificates-page__add-block">
          <h4 className="certificates-page__subtitle certificates-page__add-block-title">
            <FaPlus className="icon" aria-hidden />
            Add New Certificate
          </h4>
          <p className="certificate-description certificates-page__add-block-desc">
            Enter the <strong>Common Name (CN)</strong> for the new certificate and click &quot;Add Certificate&quot;.
          </p>

          <AddCertificate
            vpnServerId={vpnServerId}
            onSuccess={async () => {
              toast.success("Certificate added");
              await refetchCerts();
            }}
          />
        </div>

        <div className="certificates-page__list-toolbar" aria-label="Certificate list filters">
          <h4 className="certificates-page__subtitle">
            <FaFilter className="icon" aria-hidden />
            Filter by Certificate Status
          </h4>
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
        </div>

        <CertificatesTable
          certificates={certificates}
          vpnServerId={vpnServerId}
          loading={certsQuery.isFetching}
          onRevoke={async () => {
            toast.success("Certificate revoked", { toastId: "cert-revoked" });
            await silentRefetchCerts();
          }}
        />
      </section>
    </div>
  );
};

export default CertificatesData;
