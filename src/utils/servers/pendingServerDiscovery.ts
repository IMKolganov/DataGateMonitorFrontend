import { unwrapMaybeApiResponse } from "../../pages/TelegramBotSettings/unwrapApiResponse";
import type { VpnServersDtoVpnServerDiscoveryDto } from "../../api/orval/model/vpnServersDtoVpnServerDiscoveryDto";
import type { VpnServersResponsesVpnServerDiscoveriesResponse } from "../../api/orval/model/vpnServersResponsesVpnServerDiscoveriesResponse";
import type { VpnServersResponsesVpnServerDiscoveryResponse } from "../../api/orval/model/vpnServersResponsesVpnServerDiscoveryResponse";

export const PENDING_DISCOVERY_SNOOZE_KEY = "pending-server-discovery:snooze-fingerprint";

export function unwrapPendingDiscoveries(raw: unknown): VpnServersDtoVpnServerDiscoveryDto[] {
  const payload = unwrapMaybeApiResponse<VpnServersResponsesVpnServerDiscoveriesResponse>(
    raw as
      | VpnServersResponsesVpnServerDiscoveriesResponse
      | { data?: VpnServersResponsesVpnServerDiscoveriesResponse }
      | undefined,
  );
  return payload?.discoveries ?? [];
}

export function unwrapDiscoveryActionResult(
  raw: unknown,
): VpnServersResponsesVpnServerDiscoveryResponse | undefined {
  return unwrapMaybeApiResponse<VpnServersResponsesVpnServerDiscoveryResponse>(
    raw as
      | VpnServersResponsesVpnServerDiscoveryResponse
      | { data?: VpnServersResponsesVpnServerDiscoveryResponse }
      | undefined,
  );
}

/** Stable fingerprint of the current pending set (order-independent). */
export function pendingDiscoveriesFingerprint(ids: Array<number | null | undefined>): string {
  return ids
    .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
    .sort((a, b) => a - b)
    .join(",");
}

export function readPendingDiscoverySnoozeFingerprint(): string | null {
  try {
    return sessionStorage.getItem(PENDING_DISCOVERY_SNOOZE_KEY);
  } catch {
    return null;
  }
}

export function writePendingDiscoverySnoozeFingerprint(value: string): void {
  try {
    sessionStorage.setItem(PENDING_DISCOVERY_SNOOZE_KEY, value);
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Modal is snoozed when the admin chose Later for this exact pending set
 * and nothing forced it open again.
 */
export function isPendingDiscoveryModalSnoozed(opts: {
  forceShow: boolean;
  snoozeFingerprint: string | null;
  currentFingerprint: string;
}): boolean {
  const { forceShow, snoozeFingerprint, currentFingerprint } = opts;
  return (
    !forceShow &&
    snoozeFingerprint != null &&
    snoozeFingerprint === currentFingerprint &&
    currentFingerprint.length > 0
  );
}
