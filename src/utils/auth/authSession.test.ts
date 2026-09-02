import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const logout = vi.fn();
const refreshSessionTokens = vi.fn();

vi.mock("../../api/apirequest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/apirequest")>();
  return {
    ...actual,
    logout: (...args: unknown[]) => logout(...args),
    refreshSessionTokens: (...args: unknown[]) => refreshSessionTokens(...args),
  };
});

const jwtDecode = vi.fn();
vi.mock("jwt-decode", () => ({
  jwtDecode: (token: string) => jwtDecode(token),
}));

describe("authSession (JWT timer → refreshOrLogout)", () => {
  beforeEach(async () => {
    vi.resetModules();
    logout.mockClear();
    refreshSessionTokens.mockClear();
    jwtDecode.mockReset();
    vi.useFakeTimers();
    await import("./authSession");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function schedule(token: string): Promise<void> {
    const { scheduleAutoLogout } = await import("./tokenExpiryScheduler");
    scheduleAutoLogout(token);
    await vi.runAllTimersAsync();
  }

  it("logs out with refreshRejected when refresh is rejected with 401", async () => {
    refreshSessionTokens.mockRejectedValue({ response: { status: 401 } });
    jwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 1 });

    await schedule("expired-access-token");

    expect(refreshSessionTokens).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledWith("refreshRejected");
  });

  it("keeps session on transient refresh errors (network/5xx)", async () => {
    refreshSessionTokens.mockRejectedValue({ response: { status: 503 } });
    jwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 1 });

    await schedule("expired-access-token");

    expect(refreshSessionTokens).toHaveBeenCalledTimes(1);
    expect(logout).not.toHaveBeenCalled();
  });

  it("logs out with sessionExpired when refresh returns an already-expired access token", async () => {
    refreshSessionTokens.mockResolvedValue("new-but-expired");
    jwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 5 });

    await schedule("old-token");

    expect(logout).toHaveBeenCalledWith("sessionExpired");
  });

  it("reschedules timer after successful refresh", async () => {
    refreshSessionTokens.mockResolvedValue("fresh-token");
    jwtDecode
      .mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) - 1 })
      .mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) + 3600 });

    await schedule("old-token");

    expect(logout).not.toHaveBeenCalled();
    logout.mockClear();

    vi.advanceTimersByTime(3600 * 1000);
    await vi.runAllTimersAsync();

    expect(refreshSessionTokens).toHaveBeenCalledTimes(2);
  });
});
