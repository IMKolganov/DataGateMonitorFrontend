import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";

vi.mock("../components/settings/AdminActiveSessions", () => ({
  AdminActiveSessions: () => <div data-testid="admin-sessions" />,
}));
vi.mock("../components/auth/TotpSetupQrCode", () => ({
  TotpSetupQrCode: () => <div data-testid="totp-qr" />,
}));

const authApi = vi.hoisted(() => ({
  getApiAuthTotpStatus: vi.fn().mockResolvedValue({
    isAdmin: true,
    totpEnabled: false,
    requiresTotpSetup: false,
  }),
  postApiAuthTotpSetup: vi.fn().mockResolvedValue({
    sharedSecret: "ABCDEFGH",
    otpAuthUri: "otpauth://totp/DataGate:admin",
    issuer: "DataGate",
    accountName: "admin",
  }),
  postApiAuthTotpConfirm: vi.fn().mockResolvedValue({}),
  postApiAuthTotpDisable: vi.fn().mockResolvedValue({}),
}));

vi.mock("../api/orval/auth/auth", () => ({
  getApiAuthTotpStatus: authApi.getApiAuthTotpStatus,
  postApiAuthTotpSetup: authApi.postApiAuthTotpSetup,
  postApiAuthTotpConfirm: authApi.postApiAuthTotpConfirm,
  postApiAuthTotpDisable: authApi.postApiAuthTotpDisable,
}));

import AdminSecuritySettings from "./AdminSecuritySettings";

describe("AdminSecuritySettings", () => {
  beforeEach(() => {
    authApi.getApiAuthTotpStatus.mockClear();
    authApi.postApiAuthTotpSetup.mockClear();
    authApi.postApiAuthTotpConfirm.mockClear();
    authApi.postApiAuthTotpDisable.mockClear();
    authApi.getApiAuthTotpStatus.mockResolvedValue({
      isAdmin: true,
      totpEnabled: false,
      requiresTotpSetup: false,
    });
  });

  it("renders Admin security heading when TOTP is not configured", async () => {
    renderWithProviders(<AdminSecuritySettings />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Admin security/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Status:/i)).toBeInTheDocument();
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Set up authenticator/i })).toBeInTheDocument();
    expect(screen.getByTestId("admin-sessions")).toBeInTheDocument();
  });

  it("starts TOTP setup via Orval auth API", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminSecuritySettings />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Set up authenticator/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Set up authenticator/i }));

    await waitFor(() => {
      expect(authApi.postApiAuthTotpSetup).toHaveBeenCalled();
      expect(screen.getByText("ABCDEFGH")).toBeInTheDocument();
    });
    expect(screen.getByTestId("totp-qr")).toBeInTheDocument();
  });

  it("shows non-admin message when status is not admin", async () => {
    authApi.getApiAuthTotpStatus.mockResolvedValue({
      isAdmin: false,
      totpEnabled: false,
      requiresTotpSetup: false,
    });

    renderWithProviders(<AdminSecuritySettings />);

    await waitFor(() => {
      expect(
        screen.getByText(/Two-factor authentication applies to administrator accounts only/i),
      ).toBeInTheDocument();
    });
  });
});
