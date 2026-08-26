import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { toast } from "react-toastify";
import { ACCESS_TOKEN_KEY } from "../../utils/const";
import LoginPage from "./LoginPage";

vi.mock("../../contexts/useTheme", () => ({
  useTheme: () => ({
    theme: "dark",
    toggleTheme: vi.fn(),
  }),
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), info: vi.fn() },
}));

vi.mock("./PasswordLoginForm", () => ({
  default: ({ onTotpChallenge }: { onTotpChallenge: (challenge: TotpChallengeState) => void }) => (
    <button
      type="button"
      data-testid="trigger-password-totp"
      onClick={() =>
        onTotpChallenge({
          loginChallengeId: "challenge-123",
          displayName: "Alice",
        })
      }
    >
      Trigger password TOTP
    </button>
  ),
}));

vi.mock("./GoogleLoginForm", () => ({
  default: () => <div data-testid="google-login-button">Google sign-in</div>,
}));

vi.mock("./TelegramCodeLoginForm", () => ({
  default: () => <div data-testid="telegram-login-form">Telegram form</div>,
}));

import type { TotpChallengeState } from "../../utils/auth/handleLoginResponse";

function renderLoginPage(route = "/login") {
  return renderWithProviders(<LoginPage />, { route });
}

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the sign-in screen by default", () => {
    renderLoginPage();

    expect(screen.getByRole("heading", { name: /sign in to datagate monitor/i })).toBeInTheDocument();
    expect(screen.getByTestId("google-login-button")).toBeInTheDocument();
    expect(screen.queryByTestId("totp-challenge-screen")).not.toBeInTheDocument();
  });

  it("replaces the sign-in card with a dedicated TOTP screen", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByTestId("trigger-password-totp"));

    expect(screen.getByRole("heading", { name: /two-factor authentication/i })).toBeInTheDocument();
    expect(screen.getByTestId("totp-challenge-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("google-login-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("trigger-password-totp")).not.toBeInTheDocument();
  });

  it("returns to the sign-in screen when the user goes back from TOTP", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByTestId("trigger-password-totp"));
    await user.click(screen.getByRole("button", { name: /back to sign in/i }));

    expect(screen.getByRole("heading", { name: /sign in to datagate monitor/i })).toBeInTheDocument();
    expect(screen.getByTestId("google-login-button")).toBeInTheDocument();
    expect(screen.queryByTestId("totp-challenge-screen")).not.toBeInTheDocument();
  });

  it("shows a notice when redirected after forced logout", () => {
    renderLoginPage("/login?reason=sessionExpired");

    expect(screen.getByTestId("logout-reason-notice")).toHaveTextContent(/session expired/i);
    expect(vi.mocked(toast.info)).toHaveBeenCalledWith(
      expect.stringMatching(/session expired/i),
      expect.objectContaining({ autoClose: 8000 }),
    );
  });

  it("redirects to home when a session is already stored", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "existing-token");

    renderLoginPage("/login");

    expect(screen.queryByRole("heading", { name: /sign in to datagate monitor/i })).not.toBeInTheDocument();
  });

  it("redirects to safe return path when session exists", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "existing-token");

    const { queryClient } = renderLoginPage("/login?redirect=%2Fservers");

    expect(screen.queryByRole("heading", { name: /sign in to datagate monitor/i })).not.toBeInTheDocument();
    expect(queryClient).toBeDefined();
  });
});
