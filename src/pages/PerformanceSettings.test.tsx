import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockDataGrid, themeProviderMock } from "../test/mockDataGrid";

vi.mock("../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));

const httpRefetch = vi.fn();
const dbRefetch = vi.fn();
const clearMutate = vi.fn();

vi.mock("../api/orval/performance/performance", () => ({
  useGetApiPerformanceHttpRequests: () => ({
    data: {
      items: [
        {
          timestampUtc: "2024-01-01T00:00:00Z",
          requestId: "r1",
          method: "GET",
          path: "/api/servers?x=1",
          statusCode: 200,
          durationMs: 450,
          userName: "admin",
        },
        {
          timestampUtc: "2024-01-01T00:01:00Z",
          requestId: "r2",
          method: "POST",
          path: "/api/settings",
          statusCode: 500,
          durationMs: 20,
        },
      ],
    },
    isPending: false,
    isFetching: false,
    isLoading: false,
    error: null,
    refetch: httpRefetch,
  }),
  useGetApiPerformanceDbQueries: () => ({
    data: {
      items: [
        {
          timestampUtc: "2024-01-01T00:00:30Z",
          requestId: "r1",
          durationMs: 220,
          commandType: "Text",
          sql: "SELECT * FROM vpn_servers WHERE id = 1",
          succeeded: true,
        },
      ],
    },
    isPending: false,
    isFetching: false,
    isLoading: false,
    error: null,
    refetch: dbRefetch,
  }),
  useDeleteApiPerformance: () => ({
    mutate: clearMutate,
    isPending: false,
    error: null,
  }),
}));

import PerformanceSettings from "./PerformanceSettings";

const writeText = vi.fn().mockResolvedValue(undefined);

describe("PerformanceSettings", () => {
  beforeEach(() => {
    httpRefetch.mockClear();
    dbRefetch.mockClear();
    clearMutate.mockClear();
    writeText.mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("renders Performance heading, top-slow, and both grids from Orval data", () => {
    render(<PerformanceSettings />);

    expect(screen.getByRole("heading", { name: /Performance/i })).toBeInTheDocument();
    expect(screen.getByText(/Top slow HTTP/i)).toBeInTheDocument();
    expect(screen.getByText(/450 ms/)).toBeInTheDocument();
    expect(screen.getByText(/Top slow SQL/i)).toBeInTheDocument();
    expect(screen.getByText(/220 ms/)).toBeInTheDocument();

    const httpTopSelect = screen.getByRole("combobox", { name: /Top slow HTTP count/i });
    const sqlTopSelect = screen.getByRole("combobox", { name: /Top slow SQL count/i });
    expect(httpTopSelect).toHaveValue("5");
    expect(sqlTopSelect).toHaveValue("5");
    for (const n of ["5", "10", "20", "50"]) {
      expect(httpTopSelect.querySelector(`option[value="${n}"]`)).toBeTruthy();
      expect(sqlTopSelect.querySelector(`option[value="${n}"]`)).toBeTruthy();
    }

    const grids = screen.getAllByTestId("mock-grid");
    expect(grids).toHaveLength(2);
    expect(grids[0].querySelector('[data-testid="grid-rows"]')?.children).toHaveLength(2);
    expect(grids[1].querySelector('[data-testid="grid-rows"]')?.children).toHaveLength(1);
    expect(screen.getByText(/GET \/api\/servers/)).toBeInTheDocument();
    expect(screen.getByText(/SELECT \* FROM vpn_servers/)).toBeInTheDocument();
  });

  it("opens SQL detail modal from Top slow SQL with Copy", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<PerformanceSettings />);

    await user.click(screen.getByRole("button", { name: /SELECT \* FROM vpn_servers/i }));
    const dialog = screen.getByRole("dialog", { name: /SQL detail/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog.querySelector("pre")?.textContent).toMatch(/FROM vpn_servers/);

    const copyBtn = screen.getByRole("button", { name: /^Copy$/i });
    expect(copyBtn).toBeEnabled();
    await user.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("FROM vpn_servers"));
    expect(await screen.findByRole("button", { name: /Copied!/i })).toBeInTheDocument();
  });

  it("changes top-slow take independently for HTTP and SQL", async () => {
    const user = userEvent.setup();
    render(<PerformanceSettings />);

    await user.selectOptions(screen.getByRole("combobox", { name: /Top slow HTTP count/i }), "20");
    await user.selectOptions(screen.getByRole("combobox", { name: /Top slow SQL count/i }), "50");

    expect(screen.getByRole("combobox", { name: /Top slow HTTP count/i })).toHaveValue("20");
    expect(screen.getByRole("combobox", { name: /Top slow SQL count/i })).toHaveValue("50");
  });

  it("Refresh refetches both Orval queries", async () => {
    const user = userEvent.setup();
    render(<PerformanceSettings />);

    await user.click(screen.getByRole("button", { name: /Refresh/i }));
    expect(httpRefetch).toHaveBeenCalled();
    expect(dbRefetch).toHaveBeenCalled();
  });

  it("Clear confirms and calls delete mutation", async () => {
    const user = userEvent.setup();
    render(<PerformanceSettings />);

    await user.click(screen.getByRole("button", { name: /Clear/i }));
    expect(window.confirm).toHaveBeenCalled();
    expect(clearMutate).toHaveBeenCalled();
  });

  it("does not clear when confirm is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<PerformanceSettings />);

    await user.click(screen.getByRole("button", { name: /Clear/i }));
    expect(clearMutate).not.toHaveBeenCalled();
  });
});
