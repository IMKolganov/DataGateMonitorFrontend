import { apiRequest } from "../api";

export const getGeoLiteDatabaseVersion = async (): Promise<{ version: string }> => {
  const res = await apiRequest<{ version: string }>("get", "/GeoLite/GetVersionDatabase");
  return res.data;
};

export const updateGeoLiteDatabase = async (): Promise<void> => {
  await apiRequest<null>("post", "/GeoLite/UpdateDatabase");
};
