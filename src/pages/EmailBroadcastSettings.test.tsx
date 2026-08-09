import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockDataGrid, persistedPageSizeMock, themeProviderMock } from "../test/mockDataGrid";

vi.mock("../components/ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../components/ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../hooks/usePersistedPageSize.ts", () => persistedPageSizeMock(5));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const { sendMutate } = vi.hoisted(() => ({ sendMutate: vi.fn() }));

const templates = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Tpl ${i}`,
  description: "",
  subject: `Sub ${i}`,
  updatedAt: "2024-01-01T00:00:00Z",
}));

let historyPage = 1;
vi.mock("../api/orval/admin-email-broadcast/admin-email-broadcast", () => ({
  useGetApiAdminEmailBroadcastHistory: (params: { Page: number; PageSize: number }) => {
    historyPage = params.Page;
    return {
      data: {
        items: [
          {
            id: historyPage * 100,
            subject: `Hist ${historyPage}`,
            recipientEmail: "a@ex.com",
            createDate: "2024-01-01T00:00:00Z",
            success: true,
          },
        ],
        totalCount: 33,
      },
      isPending: false,
      isFetching: false,
    };
  },
  useGetApiAdminEmailBroadcastTemplates: () => ({
    data: { items: templates },
    isPending: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  usePostApiAdminEmailBroadcastSend: () => ({ mutateAsync: sendMutate, isPending: false }),
  usePostApiAdminEmailBroadcastTemplates: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePutApiAdminEmailBroadcastTemplatesId: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteApiAdminEmailBroadcastTemplatesId: () => ({ mutateAsync: vi.fn(), isPending: false }),
  getApiAdminEmailBroadcastTemplatesId: vi.fn(),
}));

import EmailBroadcastSettings from "./EmailBroadcastSettings";
import { toast } from "react-toastify";

describe("EmailBroadcastSettings", () => {
  beforeEach(() => {
    sendMutate.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("paginates templates client-side and history server-side", async () => {
    const user = userEvent.setup();
    render(<EmailBroadcastSettings />);

    const grids = screen.getAllByTestId("mock-grid");
    expect(grids.length).toBeGreaterThanOrEqual(2);

    const tplGrid = grids.find((g) => g.getAttribute("data-pagination-mode") === "client");
    expect(tplGrid).toBeTruthy();
    const tplRows = tplGrid!.querySelector('[data-testid="grid-rows"]');
    expect(tplRows?.children).toHaveLength(5);
    expect(tplRows?.textContent).toContain("Tpl 0");

    const tplNext = tplGrid!.querySelector('[data-testid="next-page"]') as HTMLButtonElement;
    await user.click(tplNext);
    expect(tplRows?.textContent).toContain("Tpl 5");

    const histGrid = grids.find((g) => g.getAttribute("data-pagination-mode") === "server");
    expect(histGrid).toHaveAttribute("data-row-count", "33");
    const histNext = histGrid!.querySelector('[data-testid="next-page"]') as HTMLButtonElement;
    await user.click(histNext);
    expect(historyPage).toBe(2);
  });

  it("renders heading and sends broadcast via Orval mutation", async () => {
    const user = userEvent.setup();
    sendMutate.mockResolvedValueOnce({ successCount: 1, failureCount: 0 });
    render(<EmailBroadcastSettings />);

    expect(screen.getByRole("heading", { name: /Email broadcast/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Subject \*/i), "Hello");
    await user.type(screen.getByLabelText(/HTML body \*/i), "<p>Hi</p>");
    await user.click(screen.getByRole("button", { name: /^Send$/i }));

    expect(sendMutate).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });
});
