import { describe, expect, it, vi } from "vitest";
import { startTransition } from "react";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";
import { Settings } from "./Settings";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    startTransition: vi.fn((cb: () => void) => actual.startTransition(cb)),
  };
});

function renderSettings(route = "/settings/general") {
  return renderWithProviders(
    <Routes>
      <Route path="/settings" element={<Settings />}>
        <Route path="cert-expiry" element={<div data-testid="settings-outlet-cert">cert</div>} />
        <Route path="telegrambot" element={<div data-testid="settings-outlet-tg">tg</div>} />
        <Route path=":tab" element={<div data-testid="settings-outlet">outlet</div>} />
      </Route>
      <Route path="/" element={<div data-testid="home">home</div>} />
    </Routes>,
    { route },
  );
}

describe("Settings shell", () => {
  it("renders Settings heading and Performance tab link", () => {
    renderSettings("/settings/performance");
    expect(screen.getByRole("heading", { name: /^Settings$/i })).toBeInTheDocument();
    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByTestId("settings-outlet")).toBeInTheDocument();
  });

  it("navigates back to home", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: /Back/i }));
    expect(screen.getByTestId("home")).toBeInTheDocument();
  });

  it("switches settings tabs via the mobile picker and keep-alive both panes", async () => {
    const user = userEvent.setup();
    renderSettings("/settings/cert-expiry");
    const picker = screen.getByRole("combobox", { name: /Settings section/i });
    expect(screen.getByTestId("settings-outlet-cert")).toBeVisible();

    await user.selectOptions(picker, "telegrambot");
    expect(screen.getByRole("heading", { name: /^Settings$/i })).toBeInTheDocument();
    expect(screen.getByTestId("settings-outlet-tg")).toBeVisible();
    // Previous heavy tab stays mounted (hidden) — avoids DataGrid remount freeze.
    expect(screen.getByTestId("settings-outlet-cert")).toBeInTheDocument();
    expect(picker).toHaveValue("telegrambot");
  });

  it("navigates tab changes through startTransition (keeps shell interactive)", async () => {
    vi.mocked(startTransition).mockClear();
    const user = userEvent.setup();
    renderSettings("/settings/cert-expiry");
    const picker = screen.getByRole("combobox", { name: /Settings section/i });
    await user.selectOptions(picker, "telegrambot");
    expect(startTransition).toHaveBeenCalled();
    expect(picker).toHaveValue("telegrambot");
  });
});
