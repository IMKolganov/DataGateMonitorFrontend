import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const addClientLink = vi.fn();

vi.mock("../../api/orval/xray-client-links-v2/xray-client-links-v2", () => ({
  postApiV2XrayClientLinks: (...args: unknown[]) => addClientLink(...args),
}));

import AddXrayClientLink from "./AddXrayClientLink";

describe("AddXrayClientLink", () => {
  beforeEach(() => {
    addClientLink.mockReset();
    addClientLink.mockResolvedValue({});
  });

  it("posts issuedTo xrayClient with the typed common name and external id", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderWithProviders(<AddXrayClientLink vpnServerId="9" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/common name/i), "user-cn");
    await user.type(screen.getByLabelText(/external id/i), "ext-42");
    await user.click(screen.getByRole("button", { name: /create client link/i }));

    await waitFor(() =>
      expect(addClientLink).toHaveBeenCalledWith({
        vpnServerId: 9,
        externalId: "ext-42",
        commonName: "user-cn",
        issuedTo: "xrayClient",
      }),
    );
    expect(onSuccess).toHaveBeenCalled();
  });
});
