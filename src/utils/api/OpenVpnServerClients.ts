import { apiRequest } from "../api";

export const fetchConnectedClients = async (VpnServerId: string, page: number, pageSize: number): Promise<any> => {
  const response = await apiRequest<{ data: any }>("get", `/OpenVpnServerClients/GetAllConnectedClients`, {
    params: { VpnServerId, page, pageSize },
  });
  return response.data;
};

export const fetchHistoryClients = async (VpnServerId: string, page: number, pageSize: number): Promise<any> => {

  const response = await apiRequest<{ data: any }>("get", `/OpenVpnServerClients/GetAllHistoryClients`, {
    params: { VpnServerId, page, pageSize },
  });
  return response.data;
};