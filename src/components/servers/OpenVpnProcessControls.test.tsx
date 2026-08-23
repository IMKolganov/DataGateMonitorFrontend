import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { OpenVpnProcessControls } from "./OpenVpnProcessControls";

const refetch = vi.fn();
const invalidateQueries = vi.fn().mockResolvedValue(undefined);
const startFn = vi.fn();
const restartFn = vi.fn();
const killFn = vi.fn();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries }),
  };
});

vi.mock("../../api/orval/vpn-server-open-vpn-process/vpn-server-open-vpn-process", () => ({
  getGetApiOpenVpnServersVpnServerIdOpenvpnProcessStatusQueryKey: (id: number) => [
    `/api/open-vpn-servers/${id}/openvpn-process/status`,
  ],
  useGetApiOpenVpnServersVpnServerIdOpenvpnProcessStatus: () => ({
    data: {
      action: "status",
      isRunning: true,
      pid: 4242,
      phase: "running",
      operationInProgress: false,
      message: "OpenVPN is running.",
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch,
  }),
  postApiOpenVpnServersVpnServerIdOpenvpnProcessStart: (...args: unknown[]) => startFn(...args),
  postApiOpenVpnServersVpnServerIdOpenvpnProcessRestart: (...args: unknown[]) => restartFn(...args),
  postApiOpenVpnServersVpnServerIdOpenvpnProcessKill: (...args: unknown[]) => killFn(...args),
}));

describe("OpenVpnProcessControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startFn.mockResolvedValue({ action: "start", isRunning: true, message: "started" });
    restartFn.mockResolvedValue({ action: "restart", isRunning: true, message: "restarted" });
    killFn.mockResolvedValue({ action: "kill", isRunning: false, message: "stopped" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("shows running status and Start disabled while running", () => {
    renderWithProviders(<OpenVpnProcessControls vpnServerId={4} />);

    expect(screen.getByText(/Running \(pid 4242\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Start$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Restart$/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Kill$/i })).toBeEnabled();
  });

  it("confirms then calls restart and shows message", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OpenVpnProcessControls vpnServerId={4} />);

    await user.click(screen.getByRole("button", { name: /^Restart$/i }));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(restartFn).toHaveBeenCalledWith(4));
    expect(await screen.findByText(/restarted/i)).toBeInTheDocument();
    expect(invalidateQueries).toHaveBeenCalled();
  });

  it("does not kill when confirm is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    renderWithProviders(<OpenVpnProcessControls vpnServerId={4} />);

    await user.click(screen.getByRole("button", { name: /^Kill$/i }));

    expect(killFn).not.toHaveBeenCalled();
  });

  it("ignores rapid multi-clicks and keeps a single in-flight call", async () => {
    let resolveKill!: (value: unknown) => void;
    killFn.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveKill = resolve;
        }),
    );
    const { fireEvent } = await import("@testing-library/react");
    renderWithProviders(<OpenVpnProcessControls vpnServerId={4} />);

    const killBtn = screen.getByRole("button", { name: /^Kill$/i });
    fireEvent.click(killBtn);
    fireEvent.click(killBtn);
    fireEvent.click(killBtn);

    expect(killFn).toHaveBeenCalledTimes(1);
    expect(restartFn).not.toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: /Stopping/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Restart$/i })).toBeDisabled();

    resolveKill({ action: "kill", isRunning: false, message: "OpenVPN stopped." });
    expect(await screen.findByText(/OpenVPN stopped/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Kill$/i })).toBeEnabled();
  });

  it("shows API error message on failure", async () => {
    const axios = await import("axios");
    killFn.mockRejectedValue(
      new axios.AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 409,
        statusText: "Conflict",
        headers: {},
        config: {} as never,
        data: {
          success: false,
          message: "OpenVPN process operation already in progress. Please wait and try again.",
        },
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<OpenVpnProcessControls vpnServerId={4} />);

    await user.click(screen.getByRole("button", { name: /^Kill$/i }));

    expect(await screen.findByText(/already in progress/i)).toBeInTheDocument();
  });
});
