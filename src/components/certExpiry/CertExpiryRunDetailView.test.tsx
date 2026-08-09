import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { MockDataGrid, themeProviderMock, persistedPageSizeMock } from "../../test/mockDataGrid";

vi.mock("../ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../../hooks/usePersistedPageSize.ts", () => persistedPageSizeMock(10));

import CertExpiryRunDetailView from "./CertExpiryRunDetailView";

describe("CertExpiryRunDetailView", () => {
  it("renders status, warning window, and summary counters", () => {
    render(
      <CertExpiryRunDetailView
        run={{
          runId: "r1",
          status: 1,
          warningDays: 14,
          sendNotifications: false,
          isScheduled: false,
          startedAtUtc: "2024-01-01T00:00:00Z",
          finishedAtUtc: "2024-01-01T00:01:00Z",
          durationMs: 1200,
          summary: {
            serversChecked: 2,
            profilesChecked: 5,
            healthy: 4,
            expired: 1,
            expiringSoon: 0,
            missingOnNode: 0,
            serverFailures: 0,
          },
          servers: [],
        }}
      />,
    );

    expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Warning window: 14 day/i)).toBeInTheDocument();
    expect(screen.getByText(/Servers: 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Expired: 1/i)).toBeInTheDocument();
  });
});
