import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { QuotaPlanFormModal } from "./QuotaPlanFormModal";
import { QuotaPlanAllowedServersModal } from "./QuotaPlanAllowedServersModal";

vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("../../api/orval/quota-plan-allowed-server/quota-plan-allowed-server", () => ({
  useGetApiQuotaPlanAllowedServersGetByQuotaPlanIdQuotaPlanId: () => ({
    data: { items: [] },
  }),
  getGetApiQuotaPlanAllowedServersGetByQuotaPlanIdQuotaPlanIdQueryKey: (id: number) => ["allowed", id],
  usePostApiQuotaPlanAllowedServersCreate: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteApiQuotaPlanAllowedServersDeleteId: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("../../api/orval/vpn-servers-v3/vpn-servers-v3", () => ({
  useGetApiV3OpenVpnServersGetAll: () => ({
    data: { vpnServers: [{ id: 1, serverName: "s1" }] },
  }),
  getGetApiV3OpenVpnServersGetAllQueryKey: () => ["v3"],
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey: () => ["v3-status"],
}));

describe("QuotaPlanFormModal", () => {
  it("renders add-plan chrome when open", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <QuotaPlanFormModal isOpen editPlan={null} onClose={onClose} onSubmit={vi.fn()} isSubmitting={false} />,
    );

    expect(screen.getByText("Add quota plan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Create$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders edit-plan chrome", () => {
    renderWithProviders(
      <QuotaPlanFormModal
        isOpen
        editPlan={{ id: 3, name: "Gold", isActive: true, isDefault: false }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );
    expect(screen.getByText("Edit quota plan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Update$/i })).toBeInTheDocument();
  });
});

describe("QuotaPlanAllowedServersModal", () => {
  it("renders allowed-servers chrome when open", () => {
    renderWithProviders(
      <QuotaPlanAllowedServersModal isOpen planId={9} planName="Gold" onClose={vi.fn()} />,
    );
    expect(screen.getByText(/Allowed servers: Gold/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Add server…/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Close/i })).toBeInTheDocument();
  });
});
