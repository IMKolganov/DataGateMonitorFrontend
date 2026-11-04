import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useDiscoveryNodeKey, useOvpnFileOrigins } from "./localIssuance";

const request = vi.hoisted(() => vi.fn());
vi.mock("./mutator", () => ({ ogmMutator: request }));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("local issuance adapters over the generated backend client", () => {
  it("keeps the payload unwrapped and uses the generated origins request", async () => {
    const origins = [{ issuedOvpnFileId: 2, origin: "local", isServiceProfile: true }];
    request.mockResolvedValueOnce(origins);
    const hook = renderHook(() => useOvpnFileOrigins(7, true), { wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current.data).toEqual(origins);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      url: "/api/open-vpn-files/origins/7", method: "GET",
    }), undefined);
  });

  it("uses the generated node-key request and shared response shape", async () => {
    request.mockResolvedValueOnce({ pendingFingerprint: "test-fingerprint" });
    const hook = renderHook(() => useDiscoveryNodeKey(5, true), { wrapper });
    await waitFor(() => expect(hook.result.current.data?.pendingFingerprint).toBe("test-fingerprint"));
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      url: "/api/open-vpn-servers/discoveries/5/node-key", method: "GET",
    }), undefined);
  });
});
