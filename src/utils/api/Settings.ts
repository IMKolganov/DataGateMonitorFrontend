import { apiRequest } from "../api";

export const getSetting = async (key: string): Promise<{ key: string; value: string }> => {
  if (!key) throw new Error("Setting key is required");

  const response = await apiRequest<{
    success: boolean;
    message: string;
    data: { key: string; value: string };
  }>("get", `/Settings/Get`, { params: { key } });

  if (!response.success) {
    throw new Error(response.message || "Unknown error");
  }

  return response.data;
};


export const setSetting = async (key: string, value: string, type: string) => {
  if (!key || !value || !type) throw new Error("Key, value, and type are required for setting");
  return apiRequest("post", `/Settings/Set`, { params: { key, value, type } });
};
