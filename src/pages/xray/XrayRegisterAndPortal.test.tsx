import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ACCESS_TOKEN_KEY } from "../../utils/const";

vi.mock("../../api/orval/auth/auth", () => ({
  postApiAuthRegister: vi.fn(),
}));
vi.mock("../../components/gdpr/GdprFooterLinks", () => ({ default: () => null }));
vi.mock("../../api/orval/vpn-servers-v3/vpn-servers-v3", () => ({
  useGetApiV3OpenVpnServersGetAll: () => ({
    data: { vpnServers: [] },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));
vi.mock("../../api/orval/xray-client-links/xray-client-links", () => ({
  postApiXrayClientLinksAddWithToken: vi.fn(),
  postApiXrayClientLinksDownloadFileByCn: vi.fn(),
}));

import XrayRegisterPage from "./XrayRegisterPage";
import XrayPortalPage from "./XrayPortalPage";

describe("XrayRegisterPage", () => {
  beforeEach(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.setItem("xray.portal.language", "en");
  });

  it("renders English create-account chrome", () => {
    renderWithProviders(<XrayRegisterPage />, { route: "/xray/register" });
    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create account/i })).toBeInTheDocument();
  });
});

describe("XrayPortalPage", () => {
  beforeEach(() => {
    localStorage.setItem("xray.portal.language", "en");
    localStorage.setItem(ACCESS_TOKEN_KEY, "header.payload.sig");
  });

  it("renders portal title and empty-servers message", () => {
    renderWithProviders(<XrayPortalPage />, { route: "/xray/" });
    expect(screen.getByText("XRay Servers")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Log out/i })).toBeInTheDocument();
    expect(screen.getByText(/No available XRay servers for your account/i)).toBeInTheDocument();
  });
});
