import type { QueryClient } from "@tanstack/react-query";
import {
  getGetApiV3OpenVpnServersGetAllQueryKey,
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey,
} from "../../api/orval/vpn-servers-v3/vpn-servers-v3";

export function invalidateVpnAccessQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({
    predicate: (query) =>
      String(query.queryKey[0] ?? "").includes("/api/user-vpn-server-access-rules/"),
  });
  queryClient.invalidateQueries({ queryKey: getGetApiV3OpenVpnServersGetAllQueryKey(undefined) });
  queryClient.invalidateQueries({
    queryKey: getGetApiV3OpenVpnServersGetAllWithStatusQueryKey(undefined),
  });
}
