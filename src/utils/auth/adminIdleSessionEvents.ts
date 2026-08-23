/** Events for admin idle session warning UI (last minute before logout). */

export const ADMIN_IDLE_WARNING_EVENT = "datagate:admin-idle-warning";
export const ADMIN_IDLE_WARNING_CLEARED_EVENT = "datagate:admin-idle-warning-cleared";
export const ADMIN_IDLE_POLICY_CHANGED_EVENT = "datagate:admin-idle-policy-changed";

export type AdminIdleWarningDetail = {
  /** Absolute time when idle logout will fire. */
  logoutAtMs: number;
};

export function notifyAdminIdleWarning(detail: AdminIdleWarningDetail): void {
  window.dispatchEvent(new CustomEvent(ADMIN_IDLE_WARNING_EVENT, { detail }));
}

export function notifyAdminIdleWarningCleared(): void {
  window.dispatchEvent(new CustomEvent(ADMIN_IDLE_WARNING_CLEARED_EVENT));
}

export function notifyAdminIdlePolicyChanged(): void {
  window.dispatchEvent(new CustomEvent(ADMIN_IDLE_POLICY_CHANGED_EVENT));
}
