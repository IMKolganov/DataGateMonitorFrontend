import type { ConnectedClientsResponse } from "../api/orvalModelShim";

export type ConnectedClientFilterParams = {
  CommonName?: string | null;
  ExternalId?: string | null;
  Search?: string | null;
};

export function hasConnectedClientFilterParams(params: ConnectedClientFilterParams): boolean {
  return Boolean(
    String(params.CommonName ?? "").trim() ||
      String(params.ExternalId ?? "").trim() ||
      String(params.Search ?? "").trim(),
  );
}

export function shouldServeConnectedTableFromMapFetch(
  isLive: boolean,
  page: number,
  filterParams: ConnectedClientFilterParams,
): boolean {
  return isLive && page === 0 && !hasConnectedClientFilterParams(filterParams);
}

export function sliceConnectedClientsTablePage(
  response: ConnectedClientsResponse | undefined,
  pageSize: number,
): ConnectedClientsResponse | undefined {
  if (!response) return undefined;
  const all = response.vpnClients ?? [];
  return {
    ...response,
    vpnClients: all.slice(0, pageSize),
    totalCount: response.totalCount ?? all.length,
  };
}
