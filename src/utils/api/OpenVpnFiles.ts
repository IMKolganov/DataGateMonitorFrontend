import { apiRequest } from "../api";

export const fetchOvpnFiles = async (vpnServerId: string): Promise<any[]> => {
  const res = await apiRequest<any[]>(
    "get",
    `/OpenVpnFiles/GetAllOvpnFiles/${vpnServerId}`
  );
  return res.data;
};

export const addClientOvpnFile = async (
  vpnServerId: number,
  externalId: string,
  commonName: string,
  issuedTo: string = "openVpnClient"
): Promise<void> => {
  await apiRequest<null>("post", "/OpenVpnFiles/AddClientOvpnFile", {
    data: { vpnServerId, externalId, commonName, issuedTo },
  });
};

export const revokeClientOvpnFile = async (
  vpnServerId: number,
  ovpnFileId: number,
  commonName: string
): Promise<void> => {
  await apiRequest<null>("post", "/OpenVpnFiles/RevokeClientOvpnFile", {
    data: { vpnServerId, ovpnFileId, commonName },
  });
};

export const downloadClientOvpnFile = async (
  issuedOvpnFileId: number,
  vpnServerId: string
): Promise<void> => {
  try {
    const res = await apiRequest<{ fileName: string; content: string }>(
      "post",
      `/OpenVpnFiles/DownloadClientOvpnFile`,
      {
        data: { issuedOvpnFileId, vpnServerId },
      }
    );

    if (!res.success) {
      throw new Error(res.message || "Unknown server error");
    }

    const { fileName, content } = res.data;

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
