/** Dispatched from Notifications to open/focus the pending discovery modal. */
export const OPEN_PENDING_SERVER_DISCOVERY_EVENT = "pending-server-discovery:open";

export type OpenPendingServerDiscoveryDetail = {
  discoveryId?: number;
};

export function openPendingServerDiscovery(discoveryId?: number): void {
  window.dispatchEvent(
    new CustomEvent<OpenPendingServerDiscoveryDetail>(OPEN_PENDING_SERVER_DISCOVERY_EVENT, {
      detail: discoveryId != null ? { discoveryId } : {},
    }),
  );
}
