import { apiRequest } from "../api";
import type { Certificate } from "../../utils/types";

// Keep helper above to avoid any hoisting confusion
const cleanDate = (date: string | null): string | null =>
  date === "0001-01-01T00:00:00" || date === null ? null : date;

export const fetchCertificates = async (
  vpnServerId: string,
  status?: string
): Promise<Certificate[]> => {
  const endpoint = status
    ? `/OpenVpnServerCerts/${vpnServerId}/GetAllVpnServerCertificatesByStatus`
    : `/OpenVpnServerCerts/${vpnServerId}/GetAllCertificates`;

  // apiRequest<T> -> returns ApiResponse<T>
  const res = await apiRequest<{ serverCertificates: any[] }>("get", endpoint, {
    params: status ? { certificateStatus: status } : {},
  });

  const certs = res.data?.serverCertificates ?? [];
  if (!Array.isArray(certs)) return [];

  return certs.map((raw) => {
    const statusVal = raw.status ?? (raw.isRevoked ? 1 : 0);
    return {
      ...raw,
      status: statusVal,
      expiryDate: raw.expiryDate ?? null,
      revokeDate: cleanDate(raw.revokeDate),
      serialNumber: raw.serialNumber ?? "",
    } as Certificate;
  });
};

export const revokeCertificate = async (
  vpnServerId: string,
  commonName: string
): Promise<void> => {
  await apiRequest<null>("post", `/OpenVpnServerCerts/RevokeCertificate`, {
    data: { vpnServerId, commonName },
  });
};

export const addCertificate = async (
  vpnServerId: string,
  commonName: string
): Promise<void> => {
  await apiRequest<null>("post", `/OpenVpnServerCerts/BuildCertificate`, {
    data: { vpnServerId, commonName },
  });
};

export const fetchServerSettings = async (vpnServerId: string): Promise<any> => {
  const res = await apiRequest<any>(
    "get",
    `/OpenVpnServerCerts/GetOpenVpnServerCertConf/${vpnServerId}`
  );
  return res.data;
};

export const updateServerSettings = async (settings: any): Promise<void> => {
  await apiRequest<null>("post", "/OpenVpnServerCerts/UpdateServerCertConfig", {
    data: settings,
  });
};