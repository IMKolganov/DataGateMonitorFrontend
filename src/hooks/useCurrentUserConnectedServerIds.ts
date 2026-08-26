import { useMemo } from "react";
import { useGetApiOpenVpnClientsUserConnectedServerIds } from "../api/orval/vpn-server-clients/vpn-server-clients";
import type { VpnServerClientsResponsesUserConnectedServerIdsResponse } from "../api/orval/model/vpnServerClientsResponsesUserConnectedServerIdsResponse";
import { isAuthenticated } from "../utils/auth/authSelectors";

const CONNECTED_SERVERS_POLL_MS = 15_000;

export function useCurrentUserConnectedServerIds(enabled = true) {
  const query = useGetApiOpenVpnClientsUserConnectedServerIds({
    query: {
      enabled: enabled && isAuthenticated(),
      staleTime: 12_000,
      refetchInterval: CONNECTED_SERVERS_POLL_MS,
      refetchIntervalInBackground: false,
      retry: 1,
    },
  });

  const connectedServerIds = useMemo(() => {
    const payload = query.data as VpnServerClientsResponsesUserConnectedServerIdsResponse | undefined;
    const ids = payload?.vpnServerIds ?? [];
    return new Set(ids.filter((id): id is number => Number.isFinite(id)));
  }, [query.data]);

  return { ...query, connectedServerIds };
}

export function isUserConnectedToServer(
  connectedServerIds: Set<number>,
  serverId: number | undefined,
): boolean {
  return serverId != null && connectedServerIds.has(serverId);
}
