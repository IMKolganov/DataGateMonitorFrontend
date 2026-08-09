import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";

vi.mock("../../api/orval/auth/auth", () => ({
  postApiAuthLogin: vi.fn(),
  postApiAuthTelegramCodeLogin: vi.fn(),
}));

vi.mock("../../utils/auth/handleLoginResponse", () => ({
  applyLoginFlow: vi.fn(),
}));

import PasswordLoginForm from "./PasswordLoginForm";
import TelegramCodeLoginForm from "./TelegramCodeLoginForm";

describe("PasswordLoginForm", () => {
  it("renders username field, forgot link, and sign-in", () => {
    renderWithProviders(<PasswordLoginForm onTotpChallenge={vi.fn()} />);
    expect(screen.getByText(/Username or email address/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Forgot password/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Sign in$/i })).toBeInTheDocument();
  });
});

describe("TelegramCodeLoginForm", () => {
  it("renders telegram code instructions and submit", () => {
    renderWithProviders(<TelegramCodeLoginForm onTotpChallenge={vi.fn()} />);
    expect(screen.getByText(/\/login_code/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ABCD1234")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign in with Telegram code/i })).toBeInTheDocument();
  });
});
