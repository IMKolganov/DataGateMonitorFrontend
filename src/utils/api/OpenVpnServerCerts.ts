import { apiRequest } from "../api";

export const fetchCertificates = async (
  vpnServerId: string,
  status?: string
): Promise<Certificate[]> => {
  const endpoint = status
    ? `/OpenVpnServerCerts/${vpnServerId}/GetAllVpnServerCertificatesByStatus`
    : `/OpenVpnServerCerts/${vpnServerId}/GetAllCertificates`;

  const res = await apiRequest<{ serverCertificates: any[] }>("get", endpoint, {
    params: status ? { certificateStatus: status } : {},
  });

  const certs = res.data.serverCertificates ?? [];
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

export const revokeCertificate = async (vpnServerId: string, commonName: string) => {
  return apiRequest<void>("post", `/OpenVpnServerCerts/RevokeCertificate`, {
    data: {
      vpnServerId,
      commonName,
    },
  });
};

export const addCertificate = async (vpnServerId: string, commonName: string) => {
  return apiRequest<void>("post", `/OpenVpnServerCerts/BuildCertificate`, {
    data: {
      vpnServerId,
      commonName,
    },
  });
};

export const fetchServerSettings = async (vpnServerId: string): Promise<any> => {
  const response = await apiRequest<{ success: boolean; message: string; data: any }>(
    "get",
    `/OpenVpnServerCerts/GetOpenVpnServerCertConf/${vpnServerId}`
  );
  return response.data;
};

export const updateServerSettings = async (settings: any): Promise<void> => {
  return apiRequest<void>("post", "/OpenVpnServerCerts/UpdateServerCertConfig", {
    data: settings,
  });
};