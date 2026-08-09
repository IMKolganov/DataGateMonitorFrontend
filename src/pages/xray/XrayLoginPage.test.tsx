import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ACCESS_TOKEN_KEY } from "../../utils/const";

vi.mock("../../api/orval/auth/auth", () => ({
  postApiAuthLogin: vi.fn(),
}));
vi.mock("../../components/auth/GoogleLoginForm", () => ({ default: () => <div>Google</div> }));
vi.mock("../../components/auth/TotpChallengeForm", () => ({ default: () => <div>TOTP</div> }));
vi.mock("../../components/gdpr/GdprFooterLinks", () => ({ default: () => null }));

import XrayLoginPage from "./XrayLoginPage";

describe("XrayLoginPage", () => {
  beforeEach(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.setItem("xray.portal.language", "en");
  });

  it("renders English welcome and sign-in chrome", () => {
    renderWithProviders(<XrayLoginPage />, { route: "/xray/login" });

    expect(screen.getByText("Welcome to DataGate")).toBeInTheDocument();
    expect(screen.getByText("XRay Access")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign in/i })).toBeInTheDocument();
  });

  it("redirects when already authenticated", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "existing");

    renderWithProviders(<XrayLoginPage />, { route: "/xray/login" });

    expect(screen.queryByText("Welcome to DataGate")).not.toBeInTheDocument();
  });
});
