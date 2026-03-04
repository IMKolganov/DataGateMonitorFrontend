// api/orval/mutator.ts
import { apiRequest, type ApiResponse } from "./apirequest";

type LowerHttpMethod = "get" | "post" | "put" | "delete" | "patch";
type AnyHttpMethod = LowerHttpMethod | Uppercase<LowerHttpMethod>;

// Unwrap ApiResponse<T> -> T (supports optional data)
type UnwrapApiResponse<T> =
    T extends ApiResponse<infer D> ? D :
        T extends { data?: infer D } ? D :
            T;

type MutatorConfig = {
  url: string;
  method?: AnyHttpMethod;
  data?: any;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  signal?: AbortSignal;
  body?: string;
};

/** Supports both (config) and (url, options) for orval v8 compatibility. */
export const ogmMutator = async <TApiResponse>(
  configOrUrl: MutatorConfig | string,
  options?: Omit<MutatorConfig, "url">
): Promise<UnwrapApiResponse<TApiResponse>> => {
  const config: MutatorConfig =
    typeof configOrUrl === "string"
      ? { url: configOrUrl, ...options } as MutatorConfig
      : configOrUrl;

  const method = (config.method as string).toLowerCase() as LowerHttpMethod;

  const res = await apiRequest<any>(method, config.url, {
    data: config.data ?? config.body,
    headers: config.headers,
    params: config.params,
    signal: config.signal,
  });

  return (res?.data ?? res) as UnwrapApiResponse<TApiResponse>;
};
