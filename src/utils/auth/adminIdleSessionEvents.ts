/** Events for admin idle session warning UI (last minute before logout). */

export const ADMIN_IDLE_WARNING_EVENT = "datagate:admin-idle-warning";
export const ADMIN_IDLE_WARNING_CLEARED_EVENT = "datagate:admin-idle-warning-cleared";
export const ADMIN_IDLE_POLICY_CHANGED_EVENT = "datagate:admin-idle-policy-changed";
/** Fired when admin idle logout deadline changes (arm/reset/stop). */
export const ADMIN_IDLE_STATE_EVENT = "datagate:admin-idle-state";
/** Fired after a successful authenticated API call — resets the local idle countdown. */
export const ADMIN_IDLE_API_ACTIVITY_EVENT = "datagate:admin-idle-api-activity";

export type AdminIdleWarningDetail = {
  /** Absolute time when idle logout will fire. */
  logoutAtMs: number;
};

export type AdminIdleStateDetail = {
  /** Absolute idle logout time, or null when idle tracking is inactive. */
  idleLogoutAtMs: number | null;
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

export function notifyAdminIdleState(detail: AdminIdleStateDetail): void {
  window.dispatchEvent(new CustomEvent(ADMIN_IDLE_STATE_EVENT, { detail }));
}

/** Call from the HTTP client after authenticated requests succeed (no dedicated heartbeat). */
export function notifyAdminApiActivity(): void {
  window.dispatchEvent(new CustomEvent(ADMIN_IDLE_API_ACTIVITY_EVENT));
}
