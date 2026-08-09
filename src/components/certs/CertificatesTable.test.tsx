import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GridRowSelectionModel } from "@mui/x-data-grid";
import type { MonitorServerCertificate } from "../../api/orvalModelShim";

vi.mock("../ui/ThemeProvider.tsx", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../hooks/usePersistedPageSize", () => ({
  usePersistedPageSize: () => [5, vi.fn()],
}));

vi.mock("react-toastify", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const revokeMock = vi.fn();
vi.mock("../../api/orval/vpn-server-certs/vpn-server-certs.ts", () => ({
  postApiOpenVpnCertsRevoke: (...args: unknown[]) => revokeMock(...args),
}));

vi.mock("../ui/TableStyle.tsx", () => ({
  default: function MockGrid(props: {
    rows: { id: string; commonName: string; status: number }[];
    rowSelectionModel: GridRowSelectionModel;
    onRowSelectionModelChange: (model: GridRowSelectionModel) => void;
    paginationModel: { page: number; pageSize: number };
    onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
    isRowSelectable?: (params: { row: { status: number } }) => boolean;
  }) {
    const start = props.paginationModel.page * props.paginationModel.pageSize;
    const pageRows = props.rows.slice(start, start + props.paginationModel.pageSize);
    return (
      <div data-testid="mock-grid">
        <button
          type="button"
          data-testid="select-all-exclude"
          onClick={() => props.onRowSelectionModelChange({ type: "exclude", ids: new Set() })}
        >
          Select all
        </button>
        <button
          type="button"
          data-testid="select-page-include"
          onClick={() => {
            const ids = new Set(
              pageRows
                .filter((row) => !props.isRowSelectable || props.isRowSelectable({ row }))
                .map((row) => row.id),
            );
            props.onRowSelectionModelChange({ type: "include", ids });
          }}
        >
          Select page
        </button>
        <button
          type="button"
          data-testid="next-page"
          onClick={() =>
            props.onPaginationModelChange({
              page: props.paginationModel.page + 1,
              pageSize: props.paginationModel.pageSize,
            })
          }
        >
          Next page
        </button>
        <ul>
          {pageRows.map((row) => (
            <li key={row.id} data-testid={`row-${row.id}`}>
              {row.commonName}
            </li>
          ))}
        </ul>
        <div data-testid="selection-type">{props.rowSelectionModel.type}</div>
        <div data-testid="selection-size">{props.rowSelectionModel.ids.size}</div>
      </div>
    );
  },
}));

import CertificatesTable from "./CertificatesTable";

function makeCerts(count: number): MonitorServerCertificate[] {
  return Array.from({ length: count }, (_, i) => ({
    commonName: `user${i}`,
    serialNumber: `s${i}`,
    status: i % 4 === 0 ? 1 : 0, // every 4th revoked
    expiryDate: "2030-01-01T00:00:00Z",
    revokeDate: null,
  })) as MonitorServerCertificate[];
}

describe("CertificatesTable pagination + selection", () => {
  beforeEach(() => {
    revokeMock.mockReset();
    revokeMock.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("disables bulk revoke until something eligible is selected on the page", async () => {
    const user = userEvent.setup();
    render(
      <CertificatesTable certificates={makeCerts(12)} vpnServerId={1} onRevoke={vi.fn()} />,
    );

    const bulk = screen.getByRole("button", { name: /revoke selected/i });
    expect(bulk).toBeDisabled();

    await user.click(screen.getByTestId("select-page-include"));
    // page size 5: user0/user4 revoked → 3 active selectable on page 0
    expect(screen.getByRole("button", { name: /revoke selected \(3\)/i })).toBeEnabled();
  });

  it("limits exclude-model select-all bulk revoke to the current page", async () => {
    const user = userEvent.setup();
    const onRevoke = vi.fn();
    render(<CertificatesTable certificates={makeCerts(12)} vpnServerId={1} onRevoke={onRevoke} />);

    await user.click(screen.getByTestId("select-all-exclude"));
    // page size 5: user0 revoked, user1-3 active, user4 revoked → 3 active on page 0
    expect(screen.getByRole("button", { name: /revoke selected \(3\)/i })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /revoke selected \(3\)/i }));
    expect(revokeMock).toHaveBeenCalledTimes(3);
    expect(revokeMock.mock.calls.map((c) => c[0].commonName).sort()).toEqual([
      "user1",
      "user2",
      "user3",
    ]);
    expect(onRevoke).toHaveBeenCalledWith(3);
  });

  it("clears selection when changing page", async () => {
    const user = userEvent.setup();
    render(
      <CertificatesTable certificates={makeCerts(12)} vpnServerId={1} onRevoke={vi.fn()} />,
    );

    await user.click(screen.getByTestId("select-all-exclude"));
    expect(screen.getByTestId("selection-type")).toHaveTextContent("exclude");

    await user.click(screen.getByTestId("next-page"));
    expect(screen.getByTestId("selection-type")).toHaveTextContent("include");
    expect(screen.getByTestId("selection-size")).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: /^revoke selected$/i })).toBeDisabled();
  });

  it("clears selection when the filter changes", async () => {
    const user = userEvent.setup();
    render(
      <CertificatesTable certificates={makeCerts(12)} vpnServerId={1} onRevoke={vi.fn()} />,
    );

    await user.click(screen.getByTestId("select-page-include"));
    expect(screen.getByTestId("selection-size")).not.toHaveTextContent("0");

    await user.type(screen.getByPlaceholderText(/search by common name/i), "user1");
    expect(screen.getByTestId("selection-size")).toHaveTextContent("0");
    expect(within(screen.getByTestId("mock-grid")).getByTestId("row-user1")).toBeInTheDocument();
  });
});
