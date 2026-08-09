import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";

const getLogs = vi.fn();
const deleteLogs = vi.fn();

vi.mock("../api/orval/vpn-servers/vpn-servers", () => ({
  getApiOpenVpnServersStatusStreamLogs: (...args: unknown[]) => getLogs(...args),
  deleteApiOpenVpnServersStatusStreamLogs: (...args: unknown[]) => deleteLogs(...args),
}));

import StatusStreamLogs from "./StatusStreamLogs";

describe("StatusStreamLogs", () => {
  beforeEach(() => {
    localStorage.clear();
    getLogs.mockReset();
    deleteLogs.mockReset();
    getLogs.mockResolvedValue({ logs: [] });
    deleteLogs.mockResolvedValue({});
    vi.spyOn(window, "setInterval").mockReturnValue(0 as unknown as ReturnType<typeof setInterval>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders heading and empty-state content after Orval fetch", async () => {
    renderWithProviders(<StatusStreamLogs />);

    expect(screen.getByRole("heading", { name: /Status Stream Logs/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(getLogs).toHaveBeenCalled();
    });
    expect(screen.getByText(/No logs yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Total in browser:/i)).toBeInTheDocument();
  });

  it("Refresh calls getApiOpenVpnServersStatusStreamLogs again", async () => {
    const user = userEvent.setup();
    renderWithProviders(<StatusStreamLogs />);

    await waitFor(() => {
      expect(getLogs).toHaveBeenCalled();
    });
    const callsAfterMount = getLogs.mock.calls.length;

    await user.click(screen.getByRole("button", { name: /Refresh/i }));
    await waitFor(() => {
      expect(getLogs.mock.calls.length).toBeGreaterThan(callsAfterMount);
    });
  });
});
