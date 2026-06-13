/**
 * Hand-written client for Xray VLESS client links (not yet in Orval spec).
 * Mirrors open-vpn-files routes but under /api/xray-client-links/.
 */
import { useQuery } from "@tanstack/react-query";
import type {
  DataTag,
  QueryClient,
  QueryFunction,
  QueryKey,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import type {
  AddFileRequest,
  DownloadFileRequest,
  DownloadFileResponseApiResponse,
  OvpnFileResponseApiResponse,
  OvpnFilesResponseApiResponse,
  RevokeFileRequest,
} from "./orvalModelShim";
import { ogmMutator } from "./mutator";

type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];

export const getApiXrayClientLinksGetAllVpnServerId = (
  vpnServerId: number,
  options?: SecondParameter<typeof ogmMutator>,
  signal?: AbortSignal,
) =>
  ogmMutator<OvpnFilesResponseApiResponse>(
    {
      url: `/api/xray-client-links/get-all/${vpnServerId}`,
      method: "GET",
      signal,
    },
    options,
  );

export const getGetApiXrayClientLinksGetAllVpnServerIdQueryKey = (vpnServerId: number) =>
  [`/api/xray-client-links/get-all/${vpnServerId}`] as const;

export const getGetApiXrayClientLinksGetAllVpnServerIdQueryOptions = <
  TData = Awaited<ReturnType<typeof getApiXrayClientLinksGetAllVpnServerId>>,
  TError = unknown,
>(
  vpnServerId: number,
  options?: {
    query?: Partial<
      UseQueryOptions<
        Awaited<ReturnType<typeof getApiXrayClientLinksGetAllVpnServerId>>,
        TError,
        TData
      >
    >;
    request?: SecondParameter<typeof ogmMutator>;
  },
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey =
    queryOptions?.queryKey ?? getGetApiXrayClientLinksGetAllVpnServerIdQueryKey(vpnServerId);
  const queryFn: QueryFunction<
    Awaited<ReturnType<typeof getApiXrayClientLinksGetAllVpnServerId>>
  > = ({ signal }) => getApiXrayClientLinksGetAllVpnServerId(vpnServerId, requestOptions, signal);
  return {
    queryKey,
    queryFn,
    enabled: !!vpnServerId,
    ...queryOptions,
  } as UseQueryOptions<
    Awaited<ReturnType<typeof getApiXrayClientLinksGetAllVpnServerId>>,
    TError,
    TData
  > & { queryKey: DataTag<QueryKey, TData, TError> };
};

export function useGetApiXrayClientLinksGetAllVpnServerId<
  TData = Awaited<ReturnType<typeof getApiXrayClientLinksGetAllVpnServerId>>,
  TError = unknown,
>(
  vpnServerId: number,
  options?: {
    query?: Partial<
      UseQueryOptions<
        Awaited<ReturnType<typeof getApiXrayClientLinksGetAllVpnServerId>>,
        TError,
        TData
      >
    >;
    request?: SecondParameter<typeof ogmMutator>;
  },
  queryClient?: QueryClient,
): UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {
  const queryOptions = getGetApiXrayClientLinksGetAllVpnServerIdQueryOptions(vpnServerId, options);
  const query = useQuery(queryOptions, queryClient) as UseQueryResult<TData, TError> & {
    queryKey: DataTag<QueryKey, TData, TError>;
  };
  return { ...query, queryKey: queryOptions.queryKey };
}

export const postApiXrayClientLinksAdd = (
  addFileRequest: AddFileRequest,
  options?: SecondParameter<typeof ogmMutator>,
  signal?: AbortSignal,
) =>
  ogmMutator<OvpnFileResponseApiResponse>(
    {
      url: `/api/xray-client-links/add`,
      method: "POST",
      headers: { "Content-Type": "application/json-patch+json" },
      data: addFileRequest,
      signal,
    },
    options,
  );

export const postApiXrayClientLinksRevokeFile = (
  revokeFileRequest: RevokeFileRequest,
  options?: SecondParameter<typeof ogmMutator>,
  signal?: AbortSignal,
) =>
  ogmMutator<OvpnFileResponseApiResponse>(
    {
      url: `/api/xray-client-links/revoke-file`,
      method: "POST",
      headers: { "Content-Type": "application/json-patch+json" },
      data: revokeFileRequest,
      signal,
    },
    options,
  );

export const postApiXrayClientLinksDownloadFile = (
  downloadFileRequest: DownloadFileRequest,
  options?: SecondParameter<typeof ogmMutator>,
  signal?: AbortSignal,
) =>
  ogmMutator<DownloadFileResponseApiResponse>(
    {
      url: `/api/xray-client-links/download-file`,
      method: "POST",
      headers: { "Content-Type": "application/json-patch+json" },
      data: downloadFileRequest,
      signal,
    },
    options,
  );
