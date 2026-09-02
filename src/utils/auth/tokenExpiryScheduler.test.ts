import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const jwtDecode = vi.fn();
vi.mock("jwt-decode", () => ({
  jwtDecode: (token: string) => jwtDecode(token),
}));

import { registerTokenExpiryHandler, scheduleAutoLogout } from "./tokenExpiryScheduler";

describe("tokenExpiryScheduler", () => {
  beforeEach(() => {
    jwtDecode.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes the registered handler when JWT is already expired", () => {
    const handler = vi.fn();
    registerTokenExpiryHandler(handler);
    jwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 10 });

    scheduleAutoLogout("expired-token");

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("invokes the handler after JWT expiry delay", () => {
    const handler = vi.fn();
    registerTokenExpiryHandler(handler);
    jwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 2 });

    scheduleAutoLogout("valid-token");
    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("reschedules when a new token is supplied", () => {
    const handler = vi.fn();
    registerTokenExpiryHandler(handler);
    jwtDecode
      .mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) + 5 })
      .mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) + 20 });

    scheduleAutoLogout("token-a");
    vi.advanceTimersByTime(4000);
    expect(handler).not.toHaveBeenCalled();

    scheduleAutoLogout("token-b");
    vi.advanceTimersByTime(5000);
    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(15000);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("falls back to handler when JWT decode fails", () => {
    const handler = vi.fn();
    registerTokenExpiryHandler(handler);
    jwtDecode.mockImplementation(() => {
      throw new Error("invalid jwt");
    });

    scheduleAutoLogout("garbage");
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
