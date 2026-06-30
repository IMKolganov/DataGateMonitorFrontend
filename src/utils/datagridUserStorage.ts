import { getCurrentUser } from "./auth/authSelectors";

export function getUserScopedStorageKey(prefix: string, storageKey: string): string {
  const user = getCurrentUser();
  const userPart = user?.id && Number.isFinite(user.id) ? String(user.id) : "anon";
  return `${prefix}:${userPart}:${storageKey}`;
}
