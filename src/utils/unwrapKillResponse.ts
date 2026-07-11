import type { KillOpenVpnClientResponse } from "../api/orvalModelShim";

/**
 * The Orval-generated type for `POST /api/open-vpn-clients/kill` is the `Api...Response`
 * envelope (`{ success, message, data }`), but `ogmMutator` already unwraps the backend
 * `ApiResponse<T>` envelope at runtime, so the actual resolved value is the inner
 * `KillOpenVpnClientResponse` itself. Handle both shapes defensively.
 */
export function unwrapKillResponse(resp: unknown): KillOpenVpnClientResponse | undefined {
  if (!resp || typeof resp !== "object") return undefined;
  const r = resp as Record<string, unknown>;
  if (r["data"] && typeof r["data"] === "object") {
    return r["data"] as KillOpenVpnClientResponse;
  }
  return r as unknown as KillOpenVpnClientResponse;
}
