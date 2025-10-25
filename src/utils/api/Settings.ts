import { apiRequest } from "../api";

export const getSetting = async (
  key: string
): Promise<{ key: string; value: string }> => {
  if (!key) throw new Error("Setting key is required");

  const res = await apiRequest<{ key: string; value: string }>(
    "get",
    "/Settings/Get",
    { params: { key } }
  );

  if (!res.success) {
    throw new Error(res.message || "Unknown error");
  }

  return res.data;
};

export const setSetting = async (
  key: string,
  value: string,
  type: string
): Promise<void> => {
  if (!key || !value || !type) {
    throw new Error("Key, value, and type are required for setting");
  }

  await apiRequest<null>("post", "/Settings/Set", {
    params: { key, value, type },
  });
};