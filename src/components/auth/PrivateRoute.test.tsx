import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ACCESS_TOKEN_KEY } from "../../utils/const";

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
});
