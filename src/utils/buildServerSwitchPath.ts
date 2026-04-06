/**
 * When picking another server in the sidebar, keep the same tab (events, console, …).
 */
export function buildServerSwitchPath(
  targetServerId: number,
  pathname: string,
  canUseAdminTabs: boolean,
): string {
  const m = pathname.match(/^\/servers\/(\d+)(?:\/(.*))?$/);
  if (!m) {
    return canUseAdminTabs ? `/servers/${targetServerId}/` : `/servers/${targetServerId}/statistics`;
  }
  const rest = m[2];
  if (rest == null || rest === "") {
    return canUseAdminTabs ? `/servers/${targetServerId}/` : `/servers/${targetServerId}/statistics`;
  }
  return `/servers/${targetServerId}/${rest}`;
}
