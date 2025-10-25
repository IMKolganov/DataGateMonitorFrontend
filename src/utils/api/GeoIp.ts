import { apiRequest } from "../api";

export const fetchDatabasePath = async (): Promise<string> => {
  const res = await apiRequest<string>("get", "/GeoIp/GetDatabasePath");
  return res.data;
};