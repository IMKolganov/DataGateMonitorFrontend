import { apiRequest } from "../api";

export const fetchEvents = async (VpnServerId: string, page: number, pageSize: number): Promise<any> => {
  const response = await apiRequest<{ data: any }>("get", `/OpenVpnServerEvent/GetEventByVpnServerId`, {
    params: { VpnServerId, page, pageSize },
  });
  return response.data;
};