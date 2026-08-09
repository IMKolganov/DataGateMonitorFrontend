import { describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";

vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const { editServerPayload } = vi.hoisted(() => ({
  editServerPayload: {
    vpnServer: {
      id: 7,
      serverName: "Existing-7",
      apiUrl: "https://node.example",
      serverType: 0,
    },
  },
}));

vi.mock("../api/orval/vpn-servers/vpn-servers", () => ({
  useGetApiOpenVpnServersGetVpnServerId: (id: number) => ({
    data: id > 0 ? editServerPayload : undefined,
    isFetching: false,
    isLoading: false,
  }),
  usePostApiOpenVpnServersAdd: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePutApiOpenVpnServersUpdate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  getApiOpenVpnServersGetVpnServerId: vi.fn(),
  getApiOpenVpnServersGetMicroserviceInfoByUrl: vi.fn(),
  getApiOpenVpnServersPostSetupVpnServerIdStatus: vi.fn(),
  postApiOpenVpnServersPostSetupVpnServerIdStart: vi.fn(),
  getGetApiOpenVpnServersGetVpnServerIdQueryKey: (id: number) => ["server", id],
  getGetApiOpenVpnServersGetServerWithStatusVpnServerIdQueryKey: (id: number) => ["status", id],
}));

vi.mock("../api/orval/vpn-server-ovpn-file-config/vpn-server-ovpn-file-config", () => ({
  useGetApiOpenVpnConfigsGetVpnServerId: () => ({ data: undefined, isLoading: false }),
  usePostApiOpenVpnConfigsAddUpdate: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../api/orval/tags/tags", () => ({
  useGetApiTagsGetAll: () => ({ data: { tags: [] } }),
  usePostApiTagsCreate: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteApiTagsDeleteId: () => ({ mutate: vi.fn(), isPending: false }),
  getGetApiTagsGetAllQueryKey: () => ["tags"],
}));

vi.mock("../api/orval/quota-plan/quota-plan", () => ({
  usePostApiQuotaPlansGetAll: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("../api/orval/quota-plan-allowed-server/quota-plan-allowed-server", () => ({
  useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId: () => ({
    data: undefined,
    isFetched: true,
  }),
  postApiQuotaPlanAllowedServersCreate: vi.fn(),
  deleteApiQuotaPlanAllowedServersDeleteId: vi.fn(),
  getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey: (id: number) => [
    "allowed",
    id,
  ],
}));

vi.mock("../api/orval/vpn-servers-v3/vpn-servers-v3", () => ({
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey: () => ["v3-servers"],
}));

import ServerForm from "./ServerForm";

describe("ServerForm", () => {
  it("mounts Add New Server form without network", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers/add" element={<ServerForm />} />
      </Routes>,
      { route: "/servers/add" },
    );

    expect(screen.getByRole("heading", { name: /Add New Server/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Server Name/i)).toBeInTheDocument();
  });

  it("shows API url label on add form", () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers/add" element={<ServerForm />} />
      </Routes>,
      { route: "/servers/add" },
    );

    expect(screen.getByLabelText(/API url/i)).toBeInTheDocument();
  });

  it("mounts Edit Server form for existing id", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/servers/edit/:serverId" element={<ServerForm />} />
      </Routes>,
      { route: "/servers/edit/7" },
    );

    expect(await screen.findByRole("heading", { name: /Edit Server/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing-7")).toBeInTheDocument();
  });
});
