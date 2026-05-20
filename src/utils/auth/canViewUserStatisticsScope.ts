import { getCurrentUser, isAdmin, type CurrentUser } from "./authSelectors";

/** Whether the current user may open per-user statistics for the given external id. */
export function canViewUserStatisticsScope(
  externalId: string | undefined,
  user?: CurrentUser | null,
): boolean {
  const trimmed = externalId?.trim();
  if (!trimmed) return true;

  const current = user ?? getCurrentUser();
  if (isAdmin(current)) return true;

  const own = current?.providerExternalId?.trim();
  return Boolean(own && trimmed === own);
}
