import { ogmMutator } from "../mutator";

export type VpnDnsTopDomainDto = {
  domain?: string;
  uniqueUsersCount?: number;
  queryCount?: number;
};

export type VpnDnsTopDomainsResponse = {
  items?: VpnDnsTopDomainDto[];
};

export type GetVpnDnsTopDomainsParams = {
  FromUtc?: string;
  ToUtc?: string;
  VpnServerId?: number;
  ExternalId?: string;
  Limit?: number;
};

export function getApiVpnDnsQueriesTopDomains(params?: GetVpnDnsTopDomainsParams, signal?: AbortSignal) {
  return ogmMutator<VpnDnsTopDomainsResponse>({
    url: "/api/vpn-dns-queries/top-domains",
    method: "GET",
    params,
    signal,
  });
}

export function getVpnDnsTopDomainsQueryKey(params?: GetVpnDnsTopDomainsParams) {
  return ["/api/vpn-dns-queries/top-domains", ...(params ? [params] : [])] as const;
}
