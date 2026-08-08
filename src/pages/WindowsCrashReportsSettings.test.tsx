import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockDataGrid, themeProviderMock } from "../test/mockDataGrid";

vi.mock("../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../api/apirequest", () => ({
  getApiBaseUrlResolved: async () => "http://test.local",
}));
vi.mock("axios", () => ({
  default: {
    get: vi.fn(async () => ({
      data: Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        receivedAt: "2024-01-01T00:00:00Z",
        appProcess: `proc-${i}`,
        fileName: `f${i}.dmp`,
        parseStatus: "ok",
      })),
    })),
  },
}));

import WindowsCrashReportsSettings from "./WindowsCrashReportsSettings";

describe("WindowsCrashReportsSettings client pagination", () => {
  it("paginates crash rows with default page size options", async () => {
    localStorage.setItem("token", "t");
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <WindowsCrashReportsSettings />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("grid-rows").children.length).toBeGreaterThan(0);
    });
    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-page-size", "10");
    expect(screen.getByTestId("grid-rows").children).toHaveLength(10);
    expect(screen.getByTestId("grid-rows").textContent).toContain("proc-0");

    await user.click(screen.getByTestId("next-page"));
    expect(screen.getByTestId("grid-rows").textContent).toContain("proc-10");
    expect(screen.getByTestId("grid-rows").textContent).not.toContain("proc-0");
  });
});
