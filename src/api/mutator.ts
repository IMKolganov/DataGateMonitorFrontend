// api/orval/mutator.ts
import { apiRequest, type ApiResponse } from "./apirequest";

type LowerHttpMethod = "get" | "post" | "put" | "delete" | "patch";
type AnyHttpMethod = LowerHttpMethod | Uppercase<LowerHttpMethod>;

// Unwrap ApiResponse<T> -> T (supports optional data)
type UnwrapApiResponse<T> =
    T extends ApiResponse<infer D> ? D :
        T extends { data?: infer D } ? D :
            T;

export const ogmMutator = async <TApiResponse>(config: {
  url: string;
  method: AnyHttpMethod;
  data?: any;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  signal?: AbortSignal;
}): Promise<UnwrapApiResponse<TApiResponse>> => {
  const method = (config.method as string).toLowerCase() as LowerHttpMethod;

  const res = await apiRequest<any>(method, config.url, {
    data: config.data,
    headers: config.headers,
    params: config.params,
    signal: config.signal,
  });

  return (res?.data ?? res) as UnwrapApiResponse<TApiResponse>;
};
