import { apiRequest } from "../api";

export const fetchToken = async (clientId: string, clientSecret: string): Promise<string> => {
  const res = await apiRequest<{ token: string }>(
    "post",
    "/Auth/token",
    { data: { clientId, clientSecret } },
    true
  );
  return res.data.token;
};

export const setSecret = async (clientId: string, clientSecret: string): Promise<void> => {
  const res = await apiRequest<null>(
    "post",
    "/Auth/set-system-secret",
    { data: { clientId, clientSecret } },
    true
  );
  if (res.success === false) {
    throw new Error(res.message || "System application is already set");
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