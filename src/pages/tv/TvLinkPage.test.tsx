import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ACCESS_TOKEN_KEY } from "../../utils/const";

const getApiAuthTvSessionByCodeUserCode = vi.fn();
vi.mock("../../api/orval/auth/auth", () => ({
  getApiAuthTvSessionByCodeUserCode: (...args: unknown[]) => getApiAuthTvSessionByCodeUserCode(...args),
  postApiAuthTvSessionApprove: vi.fn(),
  postApiAuthTvSessionDeny: vi.fn(),
}));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock("../../components/gdpr/GdprFooterLinks", () => ({ default: () => null }));

import TvLinkPage from "./TvLinkPage";

describe("TvLinkPage", () => {
  beforeEach(() => {
    getApiAuthTvSessionByCodeUserCode.mockReset();
    localStorage.setItem(ACCESS_TOKEN_KEY, "token");
  });

  it("renders link-your-TV UI for authenticated users", () => {
    renderWithProviders(<TvLinkPage />, { route: "/tv/link" });

    expect(screen.getByText(/Link your TV/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Look up/i })).toBeInTheDocument();
  });

  it("looks up a 6-digit code and shows approve/deny", async () => {
    const user = userEvent.setup();
    getApiAuthTvSessionByCodeUserCode.mockResolvedValueOnce({
      sessionId: "s1",
      userCode: "123456",
      deviceName: "Living room",
      expiresAt: "2099-01-01T00:00:00Z",
      status: "pending",
    });

    renderWithProviders(<TvLinkPage />, { route: "/tv/link" });

    await user.type(screen.getByLabelText(/Code/i), "123456");
    await user.click(screen.getByRole("button", { name: /Look up/i }));

    expect(await screen.findByText(/Approve login for “Living room”/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Approve$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Deny$/i })).toBeInTheDocument();
  });
});
