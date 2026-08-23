import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TotpChallengeForm, {
  extractSixDigitTotpFromClipboard,
  normalizeTotpCodeInput,
} from "./TotpChallengeForm";

vi.mock("../../api/orval/auth/auth", () => ({
  postApiAuthTotpVerifyLogin: vi.fn(),
}));

vi.mock("../../utils/auth/authTokens", () => ({
  storeAuthTokens: vi.fn(),
}));

vi.mock("../../utils/auth/storedProfileAvatar", () => ({
  clearStoredProfileAvatarUrl: vi.fn(),
}));

import { postApiAuthTotpVerifyLogin } from "../../api/orval/auth/auth";

describe("totp code helpers", () => {
  it("normalizes digits and caps length at 6", () => {
    expect(normalizeTotpCodeInput("12a34b56c78")).toBe("123456");
    expect(normalizeTotpCodeInput("  9-8-7  ")).toBe("987");
  });

  it("accepts clipboard text with exactly six digits", () => {
    expect(extractSixDigitTotpFromClipboard("123456")).toBe("123456");
    expect(extractSixDigitTotpFromClipboard("12 34 56")).toBe("123456");
    expect(extractSixDigitTotpFromClipboard("code: 123456")).toBe("123456");
    expect(extractSixDigitTotpFromClipboard("12345")).toBeNull();
    expect(extractSixDigitTotpFromClipboard("1234567")).toBeNull();
  });
});

describe("TotpChallengeForm", () => {
  beforeEach(() => {
    vi.mocked(postApiAuthTotpVerifyLogin).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an error when verification fails", async () => {
    vi.mocked(postApiAuthTotpVerifyLogin).mockRejectedValue(
      new Error("Invalid authentication code."),
    );

    const user = userEvent.setup();
    render(
      <TotpChallengeForm
        loginChallengeId="challenge-1"
        displayName="Alice"
        onBack={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText("000000"), "123456");
    await user.click(screen.getByRole("button", { name: /verify and sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid authentication code/i)).toBeInTheDocument();
    });
  });

  it("shows a restart hint when the login challenge expired", async () => {
    vi.mocked(postApiAuthTotpVerifyLogin).mockRejectedValue(
      new Error("Login challenge expired. Sign in again."),
    );

    const onBack = vi.fn();
    const user = userEvent.setup();
    render(
      <TotpChallengeForm
        loginChallengeId="challenge-1"
        onBack={onBack}
      />,
    );

    await user.type(screen.getByPlaceholderText("000000"), "123456");
    await user.click(screen.getByRole("button", { name: /verify and sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/not logged in yet/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /sign in again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verify and sign in/i })).toBeDisabled();
  });

  it("calls onBack when the user chooses to return to sign in", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(
      <TotpChallengeForm
        loginChallengeId="challenge-1"
        onBack={onBack}
      />,
    );

    await user.click(screen.getByRole("button", { name: /back to sign in/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("clears the code when the clear button is clicked", async () => {
    const user = userEvent.setup();
    render(<TotpChallengeForm loginChallengeId="challenge-1" />);

    const input = screen.getByPlaceholderText("000000");
    await user.type(input, "123456");
    expect(input).toHaveValue("123456");

    await user.click(screen.getByRole("button", { name: /clear code/i }));
    expect(input).toHaveValue("");
  });

  it("fills a six-digit code from the clipboard on focus", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: {
        readText: vi.fn().mockResolvedValue("12 34 56"),
      },
    });

    render(<TotpChallengeForm loginChallengeId="challenge-1" />);

    const input = screen.getByPlaceholderText("000000");
    input.focus();

    await waitFor(() => {
      expect(input).toHaveValue("123456");
    });
  });
});
