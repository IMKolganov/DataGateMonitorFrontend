import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockDataGrid, themeProviderMock, persistedPageSizeMock } from "../../test/mockDataGrid";
import { EnumsCertExpiryProfileOutcome } from "../../api/orval/model/enumsCertExpiryProfileOutcome";
import { EnumsCertExpiryServerFetchStatus } from "../../api/orval/model/enumsCertExpiryServerFetchStatus";

vi.mock("../ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../../hooks/usePersistedPageSize.ts", () => persistedPageSizeMock(5));

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

  it("paginates issue profiles with client grid props", async () => {
    const user = userEvent.setup();
    const profiles = Array.from({ length: 12 }, (_, i) => ({
      issuedOvpnFileId: i + 1,
      commonName: `cn${i}`,
      outcome: EnumsCertExpiryProfileOutcome.NUMBER_2,
      expiryUtc: "2020-01-01T00:00:00Z",
      daysLeft: -1,
      serialNumber: `ser${i}`,
    }));

    render(
      <CertExpiryRunDetailView
        run={{
          runId: "r2",
          status: 1,
          warningDays: 14,
          sendNotifications: false,
          isScheduled: false,
          startedAtUtc: "2024-01-01T00:00:00Z",
          finishedAtUtc: "2024-01-01T00:01:00Z",
          durationMs: 1200,
          summary: {
            serversChecked: 1,
            profilesChecked: 12,
            healthy: 0,
            expired: 12,
            expiringSoon: 0,
            missingOnNode: 0,
            serverFailures: 0,
          },
          servers: [
            {
              vpnServerId: 7,
              serverName: "vpn-a",
              fetchStatus: EnumsCertExpiryServerFetchStatus.NUMBER_0,
              durationMs: 10,
              profiles,
            },
          ],
        }}
      />,
    );

    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-pagination-mode", "client");
    expect(screen.getByTestId("grid-rows").children).toHaveLength(5);
    expect(screen.getByTestId("grid-rows").textContent).toContain("cn0");

    await user.click(screen.getByTestId("next-page"));
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-page", "1");
    expect(screen.getByTestId("grid-rows").textContent).toContain("cn5");
  });
});
