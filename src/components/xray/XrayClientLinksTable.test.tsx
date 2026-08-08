import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockDataGrid, persistedPageSizeMock, themeProviderMock } from "../../test/mockDataGrid";

vi.mock("../ui/ThemeProvider.tsx", () => themeProviderMock);
vi.mock("../ui/TableStyle.tsx", () => ({ default: MockDataGrid }));
vi.mock("../../hooks/usePersistedPageSize", () => persistedPageSizeMock(5));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../../api/xrayClientLinks.ts", () => ({
  postApiXrayClientLinksRevokeFile: vi.fn(),
  postApiXrayClientLinksDownloadFile: vi.fn(),
}));

import XrayClientLinksTable from "./XrayClientLinksTable";

describe("XrayClientLinksTable client pagination", () => {
  it("filters then paginates client links", async () => {
    const user = userEvent.setup();
    const links = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      commonName: `cn${i}`,
      issuedTo: i % 2 === 0 ? "alice" : "bob",
    }));

    render(
      <XrayClientLinksTable
        links={links}
        vpnServerId="7"
        onRevoke={vi.fn()}
        loading={false}
      />,
    );

    expect(screen.getByTestId("grid-rows").children).toHaveLength(5);
    await user.type(screen.getByPlaceholderText("Search by Issued To"), "alice");
    // alice rows: cn0,cn2,cn4,cn6,cn8,cn10 → first page 5
    expect(screen.getByTestId("grid-rows").children).toHaveLength(5);
    expect(screen.getByTestId("row-1")).toHaveTextContent("cn0");
  });

  it("advances to the next client page", async () => {
    const user = userEvent.setup();
    const links = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      commonName: `cn${i}`,
    }));
    render(
      <XrayClientLinksTable links={links} vpnServerId="7" onRevoke={vi.fn()} loading={false} />,
    );
    await user.click(screen.getByTestId("next-page"));
    expect(screen.getByTestId("row-6")).toHaveTextContent("cn5");
  });
});
