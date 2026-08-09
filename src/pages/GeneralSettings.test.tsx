import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";
import GeneralSettings from "./GeneralSettings";

const mutateAsync = vi.fn().mockResolvedValue({ success: true });

const settingsByKey: Record<string, string> = {
  OpenVPN_Polling_Interval: "30",
  OpenVPN_Polling_Interval_Unit: "seconds",
  Auth_Require_Email_Confirmation_On_Register: "true",
  Auth_Email_Confirmation_Code_Ttl_Minutes: "45",
  FreeTier_Allow_Grace_Without_Compliance: "false",
  FreeTier_Grace_Period_Minutes: "5",
};

vi.mock("../api/orval/settings/settings", () => ({
  useGetApiSettingsGet: (params: { Key: string }) => ({
    data: { value: settingsByKey[params.Key] ?? "" },
    isFetching: false,
    isLoading: false,
    error: null,
  }),
  usePostApiSettingsSet: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

describe("GeneralSettings", () => {
  beforeEach(() => {
    mutateAsync.mockClear();
  });

  it("renders polling and auth sections from Orval settings", () => {
    renderWithProviders(<GeneralSettings />);
    expect(screen.getByText(/OpenVPN Polling Interval/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("45")).toBeInTheDocument();
  });

  it("saves settings via Orval mutation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<GeneralSettings />);
    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    await user.click(saveButtons[0]);
    expect(mutateAsync).toHaveBeenCalled();
  });
});
