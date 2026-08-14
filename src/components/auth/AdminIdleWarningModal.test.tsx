import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, act } from "@testing-library/react";

const logout = vi.fn();
const requestStaySignedIn = vi.fn();

vi.mock("../../api/apirequest", () => ({ logout: () => logout() }));
vi.mock("../../utils/auth/adminIdleSession", () => ({
  requestStaySignedIn: () => requestStaySignedIn(),
}));

import { AdminIdleWarningModal } from "./AdminIdleWarningModal";
import {
  ADMIN_IDLE_WARNING_CLEARED_EVENT,
  ADMIN_IDLE_WARNING_EVENT,
  notifyAdminIdleWarning,
  notifyAdminIdleWarningCleared,
} from "../../utils/auth/adminIdleSessionEvents";

describe("AdminIdleWarningModal", () => {
  beforeEach(() => {
    logout.mockClear();
    requestStaySignedIn.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing until a warning event", () => {
    const { container } = render(<AdminIdleWarningModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows countdown dialog on warning and hides on clear", () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    render(<AdminIdleWarningModal />);

    act(() => {
      notifyAdminIdleWarning({ logoutAtMs: now + 45_000 });
    });

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/Session expiring soon/i)).toBeInTheDocument();
    expect(screen.getByText(/0:45/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/0:44/)).toBeInTheDocument();

    act(() => {
      notifyAdminIdleWarningCleared();
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("Sign out calls logout", () => {
    render(<AdminIdleWarningModal />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(ADMIN_IDLE_WARNING_EVENT, {
          detail: { logoutAtMs: Date.now() + 30_000 },
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign out/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("Stay signed in calls requestStaySignedIn", () => {
    render(<AdminIdleWarningModal />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent(ADMIN_IDLE_WARNING_EVENT, {
          detail: { logoutAtMs: Date.now() + 30_000 },
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /Stay signed in/i }));
    expect(requestStaySignedIn).toHaveBeenCalledTimes(1);
  });

  it("ignores warning events without logoutAtMs", () => {
    render(<AdminIdleWarningModal />);
    act(() => {
      window.dispatchEvent(new CustomEvent(ADMIN_IDLE_WARNING_EVENT, { detail: {} }));
      window.dispatchEvent(new CustomEvent(ADMIN_IDLE_WARNING_CLEARED_EVENT));
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
