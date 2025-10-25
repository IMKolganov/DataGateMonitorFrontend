import { apiRequest } from "../api";

export const fetchOvpnFiles = async (vpnServerId: string): Promise<any[]> => {
  const response = await apiRequest<{ data: any[] }>(
    "get",
    `/OpenVpnFiles/GetAllOvpnFiles/${vpnServerId}`
  );
  return response.data;
};


export const addClientOvpnFile = async (vpnServerId: number, externalId: string, commonName: string, issuedTo: string = "openVpnClient") => {
  return apiRequest<void>("post", "/OpenVpnFiles/AddClientOvpnFile", {
    data: { vpnServerId, externalId, commonName, issuedTo },
  });
};

export const revokeClientOvpnFile = async (  vpnServerId: number,  ovpnFileId: number,  commonName: string) => {
  return apiRequest<void>("post", "/OpenVpnFiles/RevokeClientOvpnFile", {
    data: { vpnServerId, ovpnFileId, commonName },
  });
};

export const downloadClientOvpnFile = async (issuedOvpnFileId: number, vpnServerId: string) => {
  await ensureApiBaseUrl();

  try {
    const response = await apiRequest<any>(
      "post",
      `/OpenVpnFiles/DownloadClientOvpnFile`,
      {
        data: {
          issuedOvpnFileId,
          vpnServerId,
        }
      }
    );

    const apiData = response;

    if (!apiData.success) {
      throw new Error(apiData.message || "Unknown server error");
    }

    const { fileName, content } = apiData.data;

    if (!content) {
      throw new Error("File content is empty.");
    }

    const binaryString = atob(content);
    const byteArray = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      byteArray[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([byteArray], { type: "application/x-openvpn-profile" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName || `client-${issuedOvpnFileId}.ovpn`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error: any) {
    const message = error?.response?.data?.message || error.message || "Unknown error occurred";
    throw new Error(`Download failed: ${message}`);
  }
};