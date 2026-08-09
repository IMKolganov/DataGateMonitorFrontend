import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";

const authApi = vi.hoisted(() => ({
  postApiAuthForgotPassword: vi.fn().mockResolvedValue({}),
  postApiAuthResetPassword: vi.fn().mockResolvedValue({}),
}));

vi.mock("../api/orval/auth/auth", () => ({
  postApiAuthForgotPassword: authApi.postApiAuthForgotPassword,
  postApiAuthResetPassword: authApi.postApiAuthResetPassword,
}));

import AdminPasswordRecoverySettings from "./AdminPasswordRecoverySettings";

describe("AdminPasswordRecoverySettings", () => {
  beforeEach(() => {
    authApi.postApiAuthForgotPassword.mockClear();
    authApi.postApiAuthResetPassword.mockClear();
  });

  it("renders recovery heading and both steps", () => {
    renderWithProviders(<AdminPasswordRecoverySettings />);

    expect(screen.getByRole("heading", { name: /Admin password recovery/i })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 — request code/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 2 — enter code and new password/i)).toBeInTheDocument();
  });

  it("requests a reset code via Orval auth API", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminPasswordRecoverySettings />);

    await user.type(screen.getByLabelText(/Administrator login or email/i), "admin@example.com");
    await user.click(screen.getByRole("button", { name: /Request reset code/i }));

    await waitFor(() => {
      expect(authApi.postApiAuthForgotPassword).toHaveBeenCalledWith({
        loginOrEmail: "admin@example.com",
      });
    });
    expect(screen.getByText(/If an admin account exists/i)).toBeInTheDocument();
  });

  it("sets a new password via Orval auth API", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminPasswordRecoverySettings />);

    await user.type(screen.getByLabelText(/One-time code/i), "123456");
    await user.type(screen.getByLabelText(/^New password$/i), "NewPass1!");
    await user.type(screen.getByLabelText(/Confirm password/i), "NewPass1!");
    await user.click(screen.getByRole("button", { name: /Set new password/i }));

    await waitFor(() => {
      expect(authApi.postApiAuthResetPassword).toHaveBeenCalledWith({
        code: "123456",
        newPassword: "NewPass1!",
        confirmPassword: "NewPass1!",
      });
    });
    expect(screen.getByText(/Password has been changed/i)).toBeInTheDocument();
  });
});
