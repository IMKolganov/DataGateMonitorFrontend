//api/orval/mutator.ts
import { apiRequest } from '../apirequest';

type LowerHttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';
type AnyHttpMethod = LowerHttpMethod | Uppercase<LowerHttpMethod>;

export const ogmMutator = async <TData>(config: {
  url: string;
  method: AnyHttpMethod;
  data?: any;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  signal?: AbortSignal;
}) => {
  const method = (config.method as string).toLowerCase() as LowerHttpMethod;

  const res = await apiRequest<TData>(method, config.url, {
    data: config.data,
    headers: config.headers,
    params: config.params,
    signal: config.signal,
  });

  return (res as any).data as TData;
};
