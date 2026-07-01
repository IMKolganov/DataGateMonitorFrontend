import { apiRequest } from "../apirequest";
import type { VpnDnsQueryPageResponse } from "../orvalModelShim";

export type VpnDnsProfileSummaryItem = {
  commonName?: string | null;
  vpnServerId?: number;
  isRevoked?: boolean;
  queryCount?: number;
  lastQueriedAtUtc?: string | null;
};

export type SearchUserDnsQueriesParams = {
  VpnServerId?: number;
  ExternalId?: string;
  CommonName?: string;
  MatchUserProfiles?: boolean;
  DomainContains?: string;
  FromUtc?: string;
  ToUtc?: string;
  Page?: number;
  PageSize?: number;
};

export type ProfileSummaryParams = {
  externalId: string;
  vpnServerId?: number;
  fromUtc?: string;
  toUtc?: string;
};

export async function searchUserDnsQueries(params: SearchUserDnsQueriesParams, signal?: AbortSignal) {
  return apiRequest<VpnDnsQueryPageResponse>("get", "/api/vpn-dns-queries/search", {
    params,
    signal,
  });
}

export async function getUserDnsProfileSummary(params: ProfileSummaryParams, signal?: AbortSignal) {
  return apiRequest<VpnDnsProfileSummaryItem[]>("get", "/api/vpn-dns-queries/profile-summary", {
    params: {
      ExternalId: params.externalId,
      VpnServerId: params.vpnServerId ?? 0,
      FromUtc: params.fromUtc,
      ToUtc: params.toUtc,
    },
    signal,
  });
}

export function userDnsQueriesQueryKey(params: SearchUserDnsQueriesParams) {
  return ["user-dns-queries", params] as const;
}

export function userDnsProfileSummaryQueryKey(params: ProfileSummaryParams) {
  return ["user-dns-profile-summary", params] as const;
}
