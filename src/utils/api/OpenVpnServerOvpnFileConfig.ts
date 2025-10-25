import { apiRequest } from "../api";

export const getOvpnFileConfig = async (VpnServerId: string | number): Promise<any> => {
  const res = await apiRequest<any>("get", `/OpenVpnServerOvpnFileConfig/GetOvpnFileConfig/${VpnServerId}`);
  return res.data;
};

export const saveOvpnFileConfig = async (configData: any) => {
  if (!configData?.VpnServerId) throw new Error("VPN Server ID is required in configData");

  return apiRequest<any>("post", "/OpenVpnServerOvpnFileConfig/AddOrUpdateOvpnFileConfig", {
    headers: { "Content-Type": "application/json" },
    data: configData,
  });
};