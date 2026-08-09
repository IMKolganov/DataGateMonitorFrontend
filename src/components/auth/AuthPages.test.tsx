import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";

vi.mock("../../api/orval/auth/auth", () => ({
  postApiAuthRegister: vi.fn(),
  postApiAuthForgotPassword: vi.fn(),
  postApiAuthResetPassword: vi.fn(),
  postApiAuthEmailConfirm: vi.fn(),
  postApiAuthEmailRequestConfirmation: vi.fn(),
}));

vi.mock("../gdpr/GdprFooterLinks", () => ({ default: () => null }));

import RegisterPage from "./RegisterPage";
import ForgotPasswordPage from "./ForgotPasswordPage";
import ConfirmEmailPage from "./ConfirmEmailPage";
import ResetPasswordPage from "./ResetPasswordPage";

describe("auth pages", () => {
  it("RegisterPage shows create-account chrome", () => {
    renderWithProviders(<RegisterPage />, { route: "/register" });
    expect(screen.getByRole("heading", { name: /Create your account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create account/i })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account/i)).toBeInTheDocument();
  });

  it("ForgotPasswordPage shows request-reset chrome", () => {
    renderWithProviders(<ForgotPasswordPage />, { route: "/forgot-password" });
    expect(screen.getByRole("heading", { name: /Forgot password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Request reset/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to sign in/i })).toBeInTheDocument();
  });

  it("ConfirmEmailPage shows confirm chrome", () => {
    renderWithProviders(<ConfirmEmailPage />, { route: "/confirm-email?email=a%40b.com" });
    expect(screen.getByRole("heading", { name: /Confirm your email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirm email/i })).toBeInTheDocument();
  });

  it("ResetPasswordPage shows reset-by-code chrome", () => {
    renderWithProviders(<ResetPasswordPage />, { route: "/reset-password?code=ABC123" });
    expect(screen.getByRole("heading", { name: /Reset password by code/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste the one-time code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reset password/i })).toBeInTheDocument();
  });
});
