import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import GoogleLoginForm from "./GoogleLoginForm";

const renderButton = vi.fn();
const initialize = vi.fn();

vi.mock("../../utils/runtimeEnv", () => ({
  getRuntimeEnv: () => ({ googleClientId: "test-client-id.apps.googleusercontent.com" }),
}));

vi.mock("../../api/orval/auth/auth", () => ({
  usePostApiAuthGoogleLogin: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("GoogleLoginForm", () => {
  beforeEach(() => {
    renderButton.mockReset();
    initialize.mockReset();

    window.google = {
      accounts: {
        id: {
          initialize,
          renderButton,
        },
      },
    };

    document.getElementById("google-identity-script")?.remove();

    const script = document.createElement("script");
    script.id = "google-identity-script";
    document.body.appendChild(script);
  });

  it("renders the Google button when mounted", async () => {
    render(<GoogleLoginForm onTotpChallenge={vi.fn()} />);

    await vi.waitFor(() => {
      expect(renderButton).toHaveBeenCalled();
    });

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("re-renders the Google button after unmount and remount", async () => {
    const onTotpChallenge = vi.fn();
    const { unmount } = render(<GoogleLoginForm onTotpChallenge={onTotpChallenge} />);

    await vi.waitFor(() => {
      expect(renderButton).toHaveBeenCalled();
    });

    const callsAfterFirstMount = renderButton.mock.calls.length;
    unmount();
    render(<GoogleLoginForm onTotpChallenge={onTotpChallenge} />);

    await vi.waitFor(() => {
      expect(renderButton.mock.calls.length).toBeGreaterThan(callsAfterFirstMount);
    });
  });
});
