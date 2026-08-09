import { describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";

vi.mock("../components/certExpiry/CertExpiryRunDetailView.tsx", () => ({
  default: ({ run }: { run: { scopeLabel?: string } }) => (
    <div data-testid="run-detail">Detail for {run.scopeLabel}</div>
  ),
}));

vi.mock("../api/orval/cert-expiry/cert-expiry.ts", () => ({
  useGetApiCertExpiryRunsRunId: (runId: string) => {
    if (runId === "missing") {
      return { data: undefined, isLoading: false, isError: false, error: null };
    }
    if (runId === "err") {
      return { data: undefined, isLoading: false, isError: true, error: new Error("boom") };
    }
    return {
      data: { id: runId, scopeLabel: "All servers" },
      isLoading: false,
      isError: false,
      error: null,
    };
  },
}));

import CertExpiryRunDetailPage from "./CertExpiryRunDetailPage";

describe("CertExpiryRunDetailPage", () => {
  it("renders run details from Orval", () => {
    renderWithProviders(
      <Routes>
        <Route path="/settings/cert-expiry/runs/:runId" element={<CertExpiryRunDetailPage />} />
      </Routes>,
      { route: "/settings/cert-expiry/runs/abc" },
    );

    expect(screen.getByRole("link", { name: /Back to cert expiry/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Certificate expiry check — All servers/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("run-detail")).toHaveTextContent("All servers");
  });

  it("shows not-found message when run is missing", () => {
    renderWithProviders(
      <Routes>
        <Route path="/settings/cert-expiry/runs/:runId" element={<CertExpiryRunDetailPage />} />
      </Routes>,
      { route: "/settings/cert-expiry/runs/missing" },
    );

    expect(screen.getByText(/Run not found/i)).toBeInTheDocument();
  });

  it("shows error message on query failure", () => {
    renderWithProviders(
      <Routes>
        <Route path="/settings/cert-expiry/runs/:runId" element={<CertExpiryRunDetailPage />} />
      </Routes>,
      { route: "/settings/cert-expiry/runs/err" },
    );

    expect(screen.getByText("boom")).toBeInTheDocument();
  });
});
