import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TotpChallengeForm from "./TotpChallengeForm";

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

describe("TotpChallengeForm", () => {
  beforeEach(() => {
    vi.mocked(postApiAuthTotpVerifyLogin).mockReset();
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
});
