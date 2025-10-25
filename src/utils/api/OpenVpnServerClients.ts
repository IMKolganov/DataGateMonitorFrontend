import { apiRequest } from "../api";
import type {
  FetchGeoPointsParams,
  FetchOverviewTotalsParams,
  OverviewSeriesResponse,
  FetchOverviewSeriesParams,
  GeoPointAggDto,
  OverviewTotalsResponse,
  OverviewUserItem
} from "../types";

export const fetchConnectedClients = async (VpnServerId: string, page: number, pageSize: number): Promise<any> => {
  const response = await apiRequest<{ data: any }>("get", `/OpenVpnServerClients/GetAllConnectedClients`, {
    params: { VpnServerId, page, pageSize },
  });
  return response.data;
};

export const fetchHistoryClients = async (VpnServerId: string, page: number, pageSize: number): Promise<any> => {

  const response = await apiRequest<{ data: any }>("get", `/OpenVpnServerClients/GetAllHistoryClients`, {
    params: { VpnServerId, page, pageSize },
  });
  return response.data;
};

export const fetchOverviewSeries = async (
  params: FetchOverviewSeriesParams
): Promise<OverviewSeriesResponse> => {
  const { from, to, grouping = "auto", vpnServerId, externalId } = params;

  const qs = new URLSearchParams();
  qs.set("from", toUtcIso(from));
  qs.set("to", toUtcIso(to));
  qs.set("grouping", grouping);
  if (vpnServerId != null) qs.set("vpnServerId", String(vpnServerId));
  if (externalId && externalId.trim()) qs.set("externalId", externalId.trim());

  const res = await apiRequest<OverviewSeriesResponse>(
    "get",
    `/OpenVpnServerClients/overview/series?${qs.toString()}`
  );
  return res.data;
};

export const fetchGeoPoints = async (
  params: FetchGeoPointsParams
): Promise<GeoPointAggDto[]> => {
  const { from, to, vpnServerId, externalId, onlyWithCoordinates = true } = params;

  const qs = new URLSearchParams();
  qs.set("from", toUtcIso(from));
  qs.set("to", toUtcIso(to));
  qs.set("onlyWithCoordinates", String(onlyWithCoordinates));
  if (vpnServerId != null) qs.set("vpnServerId", String(vpnServerId));
  if (externalId && externalId.trim()) qs.set("externalId", externalId.trim());

  const res = await apiRequest<GeoPointAggDto[]>(
    "get",
    `/OpenVpnServerClients/overview/points?${qs.toString()}`
  );
  return res.data;
};

export const fetchOverviewTotals = async (
  params: FetchOverviewTotalsParams
): Promise<OverviewTotalsResponse> => {
  const { from, to, vpnServerId, externalId } = params;

  const qs = new URLSearchParams();
  qs.set("from", toUtcIso(from));
  qs.set("to", toUtcIso(to));
  if (vpnServerId != null) qs.set("vpnServerId", String(vpnServerId));
  if (externalId && externalId.trim()) qs.set("externalId", externalId.trim());

  const res = await apiRequest<OverviewTotalsResponse>(
    "get",
    `/OpenVpnServerClients/overview/summary?${qs.toString()}`
  );
  return res.data;
};

// always serialize as UTC ISO (…Z)
const toUtcIso = (d: Date | string | number) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString();
};


export const fetchOverviewUsers = async (
  params: { from: Date | string | number; to: Date | string | number; vpnServerId?: number; externalId?: string }
): Promise<OverviewUserItem[]> => {
  const { from, to, vpnServerId, externalId } = params;

  const qs = new URLSearchParams();
  qs.set("from", toUtcIso(from));
  qs.set("to", toUtcIso(to));
  if (vpnServerId != null) qs.set("vpnServerId", String(vpnServerId));
  if (externalId && externalId.trim()) qs.set("externalId", externalId.trim());

  const res = await apiRequest<OverviewUserItem[]>(
    "get",
    `/OpenVpnServerClients/overview/users?${qs.toString()}`
  );
  return res.data;
};
