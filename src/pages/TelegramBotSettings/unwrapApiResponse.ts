// src/pages/TelegramBotSettings/unwrapApiResponse.ts

// helper for mixed Orval return types (ApiResponse<T> or plain T)
export type ApiEnvelope<T> = { data?: T; success?: boolean; message?: string };

export function unwrapMaybeApiResponse<T>(v: T | ApiEnvelope<T> | undefined): T | undefined {
  if (!v) return undefined;
  if (typeof v === "object" && v !== null && "data" in (v as any)) {
    return (v as ApiEnvelope<T>).data as T;
  }
  return v as T;
}
