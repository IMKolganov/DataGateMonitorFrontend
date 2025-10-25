import { apiRequest } from "../api";

export const fetchToken = async (clientId: string, clientSecret: string): Promise<string> => {
  const res = await apiRequest<any>("post", "/Auth/token", {
    data: { clientId, clientSecret },
  }, true);
  
  return res.data;
};

export const setSecret = async (clientId: string, clientSecret: string): Promise<void> => {
  try {
    await apiRequest<void>("post", "/Auth/set-system-secret", {
      data: { clientId, clientSecret },
    }, true);
  } catch (error: any) {
    if (error.response?.status === 400) {
      throw new Error("System application is already set");
    }
    throw error;
  }
};

export const checkSystemStatus = async (): Promise<boolean> => {
  const res = await apiRequest<{ systemSet: boolean }>(
    "get",
    "/Auth/system-secret-status",
    {},
    true
  );
  return res.data.systemSet;
};