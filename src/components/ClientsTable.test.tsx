import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MockDataGrid, themeProviderMock } from "../test/mockDataGrid";

vi.mock("./ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("./ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("./ui/UserAvatar.tsx", () => ({
  UserAvatar: () => <span data-testid="avatar" />,
}));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../utils/auth/authSelectors", () => ({
  getCurrentUser: () => ({ id: 1, isAdmin: true }),
  isAdmin: () => true,
}));
vi.mock("../api/orval/vpn-server-clients/vpn-server-clients", () => ({
  usePostApiOpenVpnClientsKill: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import ClientsTable from "./ClientsTable";

describe("ClientsTable pagination", () => {
  it("renders server page and only fires page/pageSize when values change", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <MemoryRouter>
        <ClientsTable
          clients={[{ id: 5, commonName: "cn-a", bytesReceived: 1, bytesSent: 2 } as never]}
          totalClients={55}
          page={0}
          pageSize={10}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          loading={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("mock-grid")).toHaveAttribute("data-row-count", "55");
    expect(screen.getByTestId("row-5")).toHaveTextContent("cn-a");

    await user.click(screen.getByTestId("next-page"));
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageSizeChange).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("set-page-size-20"));
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });
});
