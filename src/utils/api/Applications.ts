import { apiRequest } from "../api";

export const getAllApplications = async () => {
  const res = await apiRequest<any>("get", `/applications/GetAllApplications`);
  return res.data;
};

export const registerApplication = async (name: string) => {
  const res = await apiRequest<any>("post", "/applications/RegisterApplication", { data: { name } });
  return res.data;
};

export const revokeApplication = async (clientId: string) => {
  return apiRequest<any>("post", `/applications/RevokeApplication`, {
    data: { clientId },
  });
};