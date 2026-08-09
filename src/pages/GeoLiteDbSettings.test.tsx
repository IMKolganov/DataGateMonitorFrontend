import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";

vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("./GeoLiteDbDownloader", () => ({
  GeoLiteDbDownloader: () => <div data-testid="geolite-downloader" />,
}));

const settingsByKey: Record<string, string> = {
  GeoIp_Db_Path: "/data/GeoLite2-City.mmdb",
  GeoIp_Download_Url: "https://example.com/geoip",
  GeoIp_Account_ID: "acc-123",
  GeoIp_License_Key: "lic-456",
  GeoIp_Auto_Update_Interval_Days: "7",
};

const mutateAsync = vi.fn().mockResolvedValue({ success: true });
const refetch = vi.fn();

vi.mock("../api/orval/settings/settings", () => ({
  useGetApiSettingsGet: (params: { Key: string }) => ({
    data: { value: settingsByKey[params.Key] ?? "" },
    isFetched: true,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch,
  }),
  usePostApiSettingsSet: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

vi.mock("../api/orval/geo-lite/geo-lite", () => ({
  useGetApiGeoLiteGetVerionDb: () => ({
    data: { databaseVersion: "2024.01" },
    isLoading: false,
    error: null,
  }),
}));

import GeoLiteDbSettings from "./GeoLiteDbSettings";

describe("GeoLiteDbSettings", () => {
  beforeEach(() => {
    mutateAsync.mockClear();
    refetch.mockClear();
  });

  it("renders GeoLite2 settings and DB version from Orval", () => {
    renderWithProviders(<GeoLiteDbSettings />);

    expect(screen.getByRole("heading", { name: /GeoLite2 Settings/i })).toBeInTheDocument();
    expect(screen.getByText(/DB 2024\.01/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("/data/GeoLite2-City.mmdb")).toBeInTheDocument();
    expect(screen.getByDisplayValue("acc-123")).toBeInTheDocument();
    expect(screen.getByTestId("geolite-downloader")).toBeInTheDocument();
  });

  it("saves a setting via Orval mutation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<GeoLiteDbSettings />);

    const saveButtons = screen.getAllByRole("button", { name: /Save/i });
    await user.click(saveButtons[0]!);

    expect(mutateAsync).toHaveBeenCalledWith({
      params: {
        Key: "GeoIp_Db_Path",
        Value: "/data/GeoLite2-City.mmdb",
        Type: "string",
      },
    });
  });
});
