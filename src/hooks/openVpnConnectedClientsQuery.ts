import {
  getApiOpenVpnClientsGetAllConnected,
  getGetApiOpenVpnClientsGetAllConnectedQueryKey,
} from "../api/orval/vpn-server-clients/vpn-server-clients";

export const OPEN_VPN_LIVE_CONNECTED_CLIENTS_PAGE_SIZE = 300;
export const OPEN_VPN_SERVER_MAP_CONNECTED_CLIENTS_PAGE_SIZE = 1000;

export const openVpnServerMapConnectedClientsParams = (vpnServerId: number) =>
  ({
    VpnServerId: vpnServerId,
    Page: 1,
    PageSize: OPEN_VPN_SERVER_MAP_CONNECTED_CLIENTS_PAGE_SIZE,
  }) as const;

export const openVpnLiveConnectedClientsParams = (vpnServerId: number) =>
  ({
    VpnServerId: vpnServerId,
    Page: 1,
    PageSize: OPEN_VPN_LIVE_CONNECTED_CLIENTS_PAGE_SIZE,
  }) as const;

export const openVpnLiveConnectedClientsQueryKey = (vpnServerId: number) =>
  getGetApiOpenVpnClientsGetAllConnectedQueryKey(openVpnLiveConnectedClientsParams(vpnServerId));

export const fetchOpenVpnLiveConnectedClients = (vpnServerId: number) =>
  getApiOpenVpnClientsGetAllConnected(openVpnLiveConnectedClientsParams(vpnServerId));

export const openVpnLiveConnectedClientsQueryOptions = {
  staleTime: 12_000,
  refetchInterval: 15_000,
  refetchIntervalInBackground: false,
  retry: 1,
} as const;
