import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GridRowSelectionModel } from "@mui/x-data-grid";
import type { IssuedOvpnFileDto } from "../../api/orvalModelShim";

vi.mock("../ui/ThemeProvider.tsx", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../hooks/usePersistedPageSize", () => ({
  usePersistedPageSize: () => [5, vi.fn()],
}));

vi.mock("react-toastify", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const revokeMutate = vi.fn();
const downloadMutate = vi.fn();

vi.mock("../../api/orval/open-vpn-files/open-vpn-files.ts", () => ({
  usePostApiOpenVpnFilesRevokeFile: () => ({
    mutateAsync: revokeMutate,
    isPending: false,
  }),
  usePostApiOpenVpnFilesDownloadFile: () => ({
    mutateAsync: downloadMutate,
    isPending: false,
  }),
}));

vi.mock("../ui/TableStyle.tsx", () => ({
  default: function MockGrid(props: {
    rows: { id: string; commonName: string; isRevoked?: boolean; numericId: number | null }[];
    rowSelectionModel: GridRowSelectionModel;
    onRowSelectionModelChange: (model: GridRowSelectionModel) => void;
    paginationModel: { page: number; pageSize: number };
    onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
    isRowSelectable?: (params: {
      row: { isRevoked?: boolean; numericId: number | null };
    }) => boolean;
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
      </div>
    );
  },
}));

import OvpnFilesTable from "./OvpnFilesTable";

function makeFiles(count: number): IssuedOvpnFileDto[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    commonName: `cn${i}`,
    fileName: `cn${i}.ovpn`,
    issuedTo: i % 2 === 0 ? "alice" : "bob",
    isRevoked: i % 5 === 0,
  })) as IssuedOvpnFileDto[];
}

describe("OvpnFilesTable pagination + selection", () => {
  beforeEach(() => {
    revokeMutate.mockReset();
    revokeMutate.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("unwraps nested issuedOvpnFile payloads before paging", () => {
    render(
      <OvpnFilesTable
        ovpnFiles={[{ issuedOvpnFile: makeFiles(1)[0] }]}
        vpnServerId="1"
        onRevoke={vi.fn()}
        loading={false}
      />,
    );
    expect(screen.getByTestId("row-1")).toHaveTextContent("cn0");
  });

  it("limits exclude-model bulk revoke to eligible rows on the current page", async () => {
    const user = userEvent.setup();
    const onRevoke = vi.fn();
    render(
      <OvpnFilesTable
        ovpnFiles={makeFiles(12)}
        vpnServerId="1"
        onRevoke={onRevoke}
        loading={false}
      />,
    );

    await user.click(screen.getByTestId("select-all-exclude"));
    // page0 ids 1..5 → cn0 revoked, cn1-4 active → 4
    expect(screen.getByRole("button", { name: /revoke selected \(4\)/i })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /revoke selected \(4\)/i }));
    expect(revokeMutate).toHaveBeenCalledTimes(4);
    expect(onRevoke).toHaveBeenCalledWith(4);
  });

  it("clears selection when page changes", async () => {
    const user = userEvent.setup();
    render(
      <OvpnFilesTable
        ovpnFiles={makeFiles(12)}
        vpnServerId="1"
        onRevoke={vi.fn()}
        loading={false}
      />,
    );

    await user.click(screen.getByTestId("select-all-exclude"));
    expect(screen.getByTestId("selection-type")).toHaveTextContent("exclude");
    await user.click(screen.getByTestId("next-page"));
    expect(screen.getByTestId("selection-type")).toHaveTextContent("include");
    expect(screen.getByRole("button", { name: /^revoke selected$/i })).toBeDisabled();
  });

  it("clears selection when issued-to filter changes", async () => {
    const user = userEvent.setup();
    render(
      <OvpnFilesTable
        ovpnFiles={makeFiles(12)}
        vpnServerId="1"
        onRevoke={vi.fn()}
        loading={false}
      />,
    );

    await user.click(screen.getByTestId("select-all-exclude"));
    await user.type(screen.getByPlaceholderText(/search by issued to/i), "alice");
    expect(screen.getByTestId("selection-type")).toHaveTextContent("include");
    expect(screen.getByRole("button", { name: /^revoke selected$/i })).toBeDisabled();
  });
});
