import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { GridColDef } from "@mui/x-data-grid";
import type { IssuedOvpnFileDto } from "../../api/orvalModelShim";
import { indexOvpnFileOrigins, formatFingerprint } from "../../api/localIssuance";

vi.mock("../ui/ThemeProvider.tsx", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("../../api/orval/open-vpn-files/open-vpn-files.ts", () => ({
  usePostApiOpenVpnFilesRevokeFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePostApiOpenVpnFilesDownloadFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// Renders every column cell so the origin rendering and absence of the removed IP column is exercised.
vi.mock("../ui/TableStyle.tsx", () => ({
  default: function MockGrid(props: { rows: Record<string, unknown>[]; columns: GridColDef[] }) {
    return (
      <table>
        <tbody>
          {props.rows.map((row) => (
            <tr key={String(row.id)} data-testid={`row-${String(row.id)}`}>
              {props.columns.map((col) => (
                <td key={col.field} data-field={col.field}>
                  {col.renderCell
                    ? col.renderCell({ row, value: row[col.field], field: col.field } as never)
                    : String(row[col.field] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
}));

import OvpnFilesTable from "./OvpnFilesTable";

const files: IssuedOvpnFileDto[] = [
  { id: 1, commonName: "alice", fileName: "alice.ovpn", isRevoked: false } as IssuedOvpnFileDto,
  { id: 2, commonName: "upcloud-db1", fileName: "upcloud-db1.ovpn", isRevoked: false } as IssuedOvpnFileDto,
  { id: 3, commonName: "laptop", fileName: "laptop.ovpn", isRevoked: false } as IssuedOvpnFileDto,
];

const cell = (rowId: string, field: string) =>
  within(screen.getByTestId(`row-${rowId}`)).getByText(
    (_, el) => el?.getAttribute("data-field") === field,
  );

describe("OvpnFilesTable origin labels", () => {
  it("marks locally issued service profiles", () => {
    const origins = indexOvpnFileOrigins([
      { issuedOvpnFileId: 1, origin: "dashboard", isServiceProfile: false },
      { issuedOvpnFileId: 2, origin: "local", isServiceProfile: true },
      { issuedOvpnFileId: 3, origin: "local", isServiceProfile: false },
    ]);

    render(<OvpnFilesTable ovpnFiles={files} vpnServerId="7" onRevoke={vi.fn()} loading={false} origins={origins} />);

    expect(cell("1", "isLocal").textContent).toBe("Dashboard");
    expect(document.querySelector('[data-field="staticIp"]')).toBeNull();

    expect(cell("2", "isLocal").textContent).toContain("Issued locally");
    expect(cell("2", "isLocal").textContent).toContain("Service");

    expect(cell("3", "isLocal").textContent).toContain("Issued locally");
    expect(cell("3", "isLocal").textContent).not.toContain("Service");
  });

  it("falls back to dashboard labels when origins are unavailable", () => {
    render(<OvpnFilesTable ovpnFiles={files} vpnServerId="7" onRevoke={vi.fn()} loading={false} />);

    expect(cell("2", "isLocal").textContent).toBe("Dashboard");
  });
});

describe("localIssuance helpers", () => {
  it("indexes origins by id and ignores junk", () => {
    const map = indexOvpnFileOrigins([
      { issuedOvpnFileId: 5, origin: "local", isServiceProfile: true },
      null as never,
    ]);
    expect([...map.keys()]).toEqual([5]);
    expect(indexOvpnFileOrigins(undefined).size).toBe(0);
  });

  it("groups fingerprints for comparison", () => {
    expect(formatFingerprint("abcd1234ef")).toBe("abcd 1234 ef");
  });
});
