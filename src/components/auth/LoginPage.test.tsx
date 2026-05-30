import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./LoginPage";
import type { TotpChallengeState } from "../../utils/auth/handleLoginResponse";

vi.mock("../../contexts/useTheme", () => ({
  useTheme: () => ({
    theme: "dark",
    toggleTheme: vi.fn(),
  }),
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn() },
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

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
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
});
