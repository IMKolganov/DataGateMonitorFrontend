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
        <Route path=":tab" element={<div data-testid="settings-outlet">outlet</div>} />
        <Route path=":tab/*" element={<div data-testid="settings-outlet">outlet</div>} />
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
});
