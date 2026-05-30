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

    class ResizeObserverMock {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

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

  it("uses the container width for the Google button", async () => {
    const getBoundingClientRect = vi.fn(() => ({
      width: 320,
      height: 0,
      top: 0,
      left: 0,
      right: 320,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
    HTMLElement.prototype.getBoundingClientRect = getBoundingClientRect;

    render(<GoogleLoginForm onTotpChallenge={vi.fn()} />);

    await vi.waitFor(() => {
      expect(renderButton).toHaveBeenCalled();
    });

    const opts = renderButton.mock.calls.at(-1)?.[1] as { width?: number } | undefined;
    expect(opts?.width).toBe(320);
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
