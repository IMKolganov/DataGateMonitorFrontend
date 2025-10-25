import { apiRequest } from "../api";

export const getTelegramBotUsers = async () => {
  const res = await apiRequest<any>("get", `/TelegramBotUser/GetAllUsers`);
  return res.data;
};

export const blockUser = async (telegramId: number) => {
  return apiRequest<any>("post", `/TelegramBotUser/BlockUser`, {
    data: { telegramId },
  });
};

export const unblockUser = async (telegramId: number) => {
  return apiRequest<any>("post", `/TelegramBotUser/UnblockUser`, {
    data: { telegramId },
  });
};

export const setAdmin = async (telegramId: number) => {
  return apiRequest<any>("post", `/TelegramBotUser/SetAdmin`, {
    data: { telegramId },
  });
};

export const unsetAdmin = async (telegramId: number) => {
  return apiRequest<any>("post", `/TelegramBotUser/UnsetAdmin`, {
    data: { telegramId },
  });
};