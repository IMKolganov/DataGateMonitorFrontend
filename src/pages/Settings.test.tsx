import { describe, expect, it } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";
import { Settings } from "./Settings";

function renderSettings(route = "/settings/general") {
  return renderWithProviders(
    <Routes>
      <Route path="/settings" element={<Settings />}>
        <Route path="general" element={<div data-testid="settings-outlet-general">general</div>} />
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

  it("leaves general for cert-expiry without snapping back", async () => {
    const user = userEvent.setup();
    renderSettings("/settings/general");
    expect(screen.getByTestId("settings-outlet-general")).toBeVisible();

    const picker = screen.getByRole("combobox", { name: /Settings section/i });
    await user.selectOptions(picker, "cert-expiry");
    expect(screen.getByTestId("settings-outlet-cert")).toBeVisible();
    expect(screen.queryByTestId("settings-outlet-general")).not.toBeInTheDocument();
    expect(picker).toHaveValue("cert-expiry");
  });
});
