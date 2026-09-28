import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../../utils/const";
import { ACCESS_TOKEN_REFRESHED_EVENT } from "../../utils/auth/accessTokenEvents";
import {
  beginAuthBootstrap,
  resetAuthBootstrapForTests,
} from "../../utils/auth/authBootstrap";

const logout = vi.fn();
const isLoginRedirectInProgress = vi.fn(() => false);

vi.mock("../../api/apirequest", () => ({
  logout: (...args: unknown[]) => logout(...args),
  isLoginRedirectInProgress: () => isLoginRedirectInProgress(),
}));

import { PrivateRoute } from "./PrivateRoute";

describe("PrivateRoute", () => {
  beforeEach(() => {
    localStorage.clear();
    logout.mockClear();
    isLoginRedirectInProgress.mockReturnValue(false);
    resetAuthBootstrapForTests();
  });

  it("renders children when access token is present", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "access");

    const { getByText } = render(
      <MemoryRouter initialEntries={["/servers"]}>
        <Routes>
          <Route
            path="/servers"
            element={
              <PrivateRoute>
                <div>secret page</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(getByText("secret page")).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it("calls logout(missingToken) when unauthenticated and no redirect in progress", async () => {
    render(
      <MemoryRouter initialEntries={["/servers"]}>
        <Routes>
          <Route
            path="/servers"
            element={
              <PrivateRoute>
                <div>secret page</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(logout).toHaveBeenCalledWith("missingToken");
    });
  });

  it("does not invent missingToken when logout redirect already started (idle race)", async () => {
    isLoginRedirectInProgress.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/servers"]}>
        <Routes>
          <Route
            path="/servers"
            element={
              <PrivateRoute>
                <div>secret page</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(isLoginRedirectInProgress).toHaveBeenCalled();
    });
    expect(logout).not.toHaveBeenCalled();
  });

  it("waits for silent-refresh bootstrap before missingToken logout", async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-only");
    let resolveRefresh!: (token: string) => void;
    const refreshWork = new Promise<string>((resolve) => {
      resolveRefresh = resolve;
    });
    void beginAuthBootstrap(refreshWork);

    const { queryByText, getByText } = render(
      <MemoryRouter initialEntries={["/servers"]}>
        <Routes>
          <Route
            path="/servers"
            element={
              <PrivateRoute>
                <div>secret page</div>
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(queryByText("secret page")).not.toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();

    localStorage.setItem(ACCESS_TOKEN_KEY, "restored-access");
    resolveRefresh("restored-access");
    window.dispatchEvent(new CustomEvent(ACCESS_TOKEN_REFRESHED_EVENT));

    await waitFor(() => {
      expect(getByText("secret page")).toBeInTheDocument();
    });
    expect(logout).not.toHaveBeenCalled();
  });
});
