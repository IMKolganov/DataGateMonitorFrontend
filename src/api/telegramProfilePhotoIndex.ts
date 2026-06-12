import axios from "axios";
import { getApiBaseUrlResolved } from "./apirequest";
import { ACCESS_TOKEN_KEY } from "../utils/const";
import { unwrapMaybeApiResponse } from "../pages/TelegramBotSettings/unwrapApiResponse";
import type { ApiEnvelope } from "../pages/TelegramBotSettings/unwrapApiResponse";

export type TelegramBotUserProfilePhotoIndexResponse = {
  telegramIdsWithPhoto?: number[];
};

export async function fetchTelegramProfilePhotoIndex(signal?: AbortSignal): Promise<Set<number>> {
  const base = await getApiBaseUrlResolved();
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return new Set();

  const resp = await axios.get<
    TelegramBotUserProfilePhotoIndexResponse | ApiEnvelope<TelegramBotUserProfilePhotoIndexResponse>
  >(`${base}/api/tgbot-users/profile-photo-index`, {
    signal,
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = unwrapMaybeApiResponse<TelegramBotUserProfilePhotoIndexResponse>(resp.data);
  const ids = payload?.telegramIdsWithPhoto ?? [];
  return new Set(ids.filter((id) => Number.isFinite(id) && id > 0));
}

/** Load cached Telegram avatar only when the backend index confirms a stored photo. */
export function telegramPhotoTelegramIdIfCached(
  telegramId: number | undefined,
  index: Set<number> | undefined,
): number | undefined {
  if (telegramId == null || !index?.has(telegramId)) return undefined;
  return telegramId;
}
