import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/renderWithProviders";

vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../config/apiBase", () => ({ getApiBaseUrl: () => "http://test.local/api" }));
vi.mock("../utils/auth/signalRAccessToken.ts", () => ({
  resolveHubAccessToken: async () => "t",
}));
vi.mock("../utils/signalrTransport.ts", () => ({ getSignalRPreferredTransport: () => 0 }));

vi.mock("@microsoft/signalr", () => ({
  HubConnectionBuilder: class {
    withUrl() {
      return this;
    }
    withAutomaticReconnect() {
      return this;
    }
    configureLogging() {
      return this;
    }
    build() {
      return {
        on: vi.fn(),
        off: vi.fn(),
        start: vi.fn(async () => undefined),
        stop: vi.fn(async () => undefined),
      };
    }
  },
  LogLevel: { None: 0 },
}));

vi.mock("../api/orval/geo-lite/geo-lite", () => ({
  useGetApiGeoLiteGetVerionDb: () => ({
    data: { databaseVersion: "2024.08" },
    isLoading: false,
    refetch: vi.fn(),
  }),
  usePostApiGeoLiteUpdateDb: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

import { GeoLiteDbDownloader } from "./GeoLiteDbDownloader";

describe("GeoLiteDbDownloader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders version and update button from Orval", () => {
    renderWithProviders(<GeoLiteDbDownloader />);

    expect(screen.getByText("GeoLite2 Downloader")).toBeInTheDocument();
    expect(screen.getByText(/Current DB Version:/i)).toBeInTheDocument();
    expect(screen.getByText("2024.08")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Update GeoLite Database/i })).toBeInTheDocument();
  });
});
