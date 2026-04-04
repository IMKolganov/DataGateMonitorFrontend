/** Dispatched after access token is replaced in localStorage (refresh or login flows that set storage elsewhere should dispatch too if hubs must reconnect). */
export const ACCESS_TOKEN_REFRESHED_EVENT = "ogm-access-token-refreshed";

export function notifyAccessTokenRefreshed(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ACCESS_TOKEN_REFRESHED_EVENT));
}
