import { apiRequest } from "../api";

export const runServiceNow = async (): Promise<void> => {
  await apiRequest<void>("post", "/OpenVpnServers/run-now");
};

export const fetchServers = async (): Promise<any[]> => {
  const res = await apiRequest<any[]>("get", "/OpenVpnServers/GetAllServersWithStatus");
  return res.data;
};

export const fetchServersWithStats = async (id: string): Promise<any> => {
  const res = await apiRequest<any>("get", `/OpenVpnServers/GetServerWithStatus/${id}`);
  return res.data;
};

export const deleteServer = async (id: number) => {
  return apiRequest<void>("delete", `/OpenVpnServers/DeleteServer/${id}`, );
};

export const getServer = async (id: string): Promise<any> => {
  const res = await apiRequest<any>("get", `/OpenVpnServers/GetServer/${id}`);
  return res.data;
};

export const saveServer = async (serverData: any, isEditing: boolean) => {
  const url = isEditing ? "/OpenVpnServers/UpdateServer" : "/OpenVpnServers/AddServer";
  const method: "put" | "post" = isEditing ? "put" : "post";

  return apiRequest<any>(method, url, {
    headers: { "Content-Type": "application/json" },
    data: serverData,
  });
};