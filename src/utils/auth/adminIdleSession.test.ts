import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const logout = vi.fn();
vi.mock("../../api/apirequest", () => ({ logout: () => logout() }));
vi.mock("../../api/orval/auth/auth", () => ({
  getApiAuthSessionPolicy: vi.fn(async () => ({
    success: true,
    data: { adminIdleTimeoutMinutes: 15 },
  })),
  postApiAuthActivity: vi.fn(async () => ({})),
}));
vi.mock("../../api/orvalPayload", () => ({
  orvalPayload: <T,>(value: { data?: T; success?: boolean } | T | null | undefined): T => {
    if (
      value != null &&
      typeof value === "object" &&
      "data" in value &&
      "success" in value &&
      (value as { data?: T }).data !== undefined
    ) {
      return (value as { data: T }).data;
    }
    return value as T;
  },
}));

const decodeToken = vi.fn();
vi.mock("./jwt", () => ({
  decodeToken: (t: string) => decodeToken(t),
}));

import { getApiAuthSessionPolicy, postApiAuthActivity } from "../../api/orval/auth/auth";
import { ACCESS_TOKEN_KEY } from "../const";
import { SystemRoles } from "../../constants/systemRoles";
import {
  ADMIN_IDLE_WARNING_BEFORE_MS,
  requestStaySignedIn,
  startAdminIdleSession,
} from "./adminIdleSession";
import {
  ADMIN_IDLE_POLICY_CHANGED_EVENT,
  ADMIN_IDLE_WARNING_CLEARED_EVENT,
  ADMIN_IDLE_WARNING_EVENT,
  notifyAdminIdlePolicyChanged,
  type AdminIdleWarningDetail,
} from "./adminIdleSessionEvents";

const getPolicy = vi.mocked(getApiAuthSessionPolicy);
const postActivity = vi.mocked(postApiAuthActivity);

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

function policyResponse(minutes: number) {
  return { success: true as const, data: { adminIdleTimeoutMinutes: minutes } };
}

async function flushPolicyFetch(): Promise<void> {
  // Resolve getApiAuthSessionPolicy().then(...) without advancing idle timers.
  await Promise.resolve();
  await Promise.resolve();
}

function listenWarnings() {
  const warnings: AdminIdleWarningDetail[] = [];
  const clears: number[] = [];
  const onWarn = (ev: Event) => {
    warnings.push((ev as CustomEvent<AdminIdleWarningDetail>).detail);
  };
  const onClear = () => {
    clears.push(1);
  };
  window.addEventListener(ADMIN_IDLE_WARNING_EVENT, onWarn);
  window.addEventListener(ADMIN_IDLE_WARNING_CLEARED_EVENT, onClear);
  return {
    warnings,
    clears,
    dispose: () => {
      window.removeEventListener(ADMIN_IDLE_WARNING_EVENT, onWarn);
      window.removeEventListener(ADMIN_IDLE_WARNING_CLEARED_EVENT, onClear);
    },
  };
}

function startAdmin(minutes: number): () => void {
  localStorage.setItem(ACCESS_TOKEN_KEY, "tok");
  decodeToken.mockReturnValue({
    role: SystemRoles.Admin,
    adminIdleTimeoutMinutes: minutes,
  });
  getPolicy.mockResolvedValue(policyResponse(minutes));
  return startAdminIdleSession();
}

describe("startAdminIdleSession", () => {
  let stop: (() => void) | undefined;

  beforeEach(() => {
    localStorage.clear();
    logout.mockClear();
    decodeToken.mockReset();
    getPolicy.mockReset();
    getPolicy.mockResolvedValue(policyResponse(15));
    postActivity.mockClear();
    postActivity.mockResolvedValue({});
    stop = undefined;
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    vi.useRealTimers();
    delete (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn;
  });

  it("no-ops without access token", () => {
    stop = startAdminIdleSession();
    expect(typeof stop).toBe("function");
    expect(logout).not.toHaveBeenCalled();
  });

  it("no-ops for non-admin tokens", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "tok");
    decodeToken.mockReturnValue({ role: "User" });
    stop = startAdminIdleSession();
    expect(logout).not.toHaveBeenCalled();
    expect(
      (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn,
    ).toBeUndefined();
  });

  it("logs out after idle timeout for admins", async () => {
    stop = startAdmin(1);
    await flushPolicyFetch();

    vi.advanceTimersByTime(59_999);
    expect(logout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("reads admin role from long-form claim and string timeout", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "tok");
    decodeToken.mockReturnValue({
      [ROLE_CLAIM]: SystemRoles.Admin,
      adminIdleTimeoutMinutes: "2",
    });
    getPolicy.mockResolvedValue(policyResponse(2));

    const { warnings, dispose } = listenWarnings();
    stop = startAdminIdleSession();
    await flushPolicyFetch();

    vi.advanceTimersByTime(60_000);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(logout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(logout).toHaveBeenCalledTimes(1);
    dispose();
  });

  it("emits warning one minute before logout when timeout is longer", async () => {
    const { warnings, dispose } = listenWarnings();
    stop = startAdmin(3);
    await flushPolicyFetch();

    vi.advanceTimersByTime(3 * 60_000 - ADMIN_IDLE_WARNING_BEFORE_MS - 1);
    expect(warnings).toHaveLength(0);

    vi.advanceTimersByTime(1);
    expect(warnings).toHaveLength(1);
    expect(typeof warnings[0]?.logoutAtMs).toBe("number");
    expect(logout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(ADMIN_IDLE_WARNING_BEFORE_MS);
    expect(logout).toHaveBeenCalledTimes(1);
    dispose();
  });

  it("shows warning immediately when timeout is one minute", async () => {
    const { warnings, dispose } = listenWarnings();
    stop = startAdmin(1);
    await flushPolicyFetch();

    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(logout).not.toHaveBeenCalled();
    dispose();
  });

  it("requestStaySignedIn clears warning and postpones logout", async () => {
    const { warnings, clears, dispose } = listenWarnings();
    stop = startAdmin(3);
    await flushPolicyFetch();

    vi.advanceTimersByTime(3 * 60_000 - ADMIN_IDLE_WARNING_BEFORE_MS);
    expect(warnings.length).toBeGreaterThanOrEqual(1);

    logout.mockClear();
    requestStaySignedIn();
    expect(clears.length).toBeGreaterThanOrEqual(1);
    expect(postActivity).toHaveBeenCalled();

    vi.advanceTimersByTime(ADMIN_IDLE_WARNING_BEFORE_MS);
    expect(logout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3 * 60_000 - ADMIN_IDLE_WARNING_BEFORE_MS - 1);
    expect(logout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(logout).toHaveBeenCalledTimes(1);
    dispose();
  });

  it("activity after warning clears it and resets the idle timer", async () => {
    const { warnings, clears, dispose } = listenWarnings();
    stop = startAdmin(3);
    await flushPolicyFetch();

    vi.advanceTimersByTime(3 * 60_000 - ADMIN_IDLE_WARNING_BEFORE_MS);
    expect(warnings.length).toBeGreaterThanOrEqual(1);

    logout.mockClear();
    window.dispatchEvent(new Event("mousedown"));
    expect(clears.length).toBeGreaterThanOrEqual(1);

    vi.advanceTimersByTime(ADMIN_IDLE_WARNING_BEFORE_MS);
    expect(logout).not.toHaveBeenCalled();
    dispose();
  });

  it("applies updated timeout after ADMIN_IDLE_POLICY_CHANGED_EVENT", async () => {
    stop = startAdmin(10);
    await flushPolicyFetch();

    getPolicy.mockResolvedValue(policyResponse(2));
    notifyAdminIdlePolicyChanged();
    await flushPolicyFetch();

    logout.mockClear();
    vi.advanceTimersByTime(2 * 60_000 - 1);
    expect(logout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("stop cancels pending logout and clears stay-signed-in hook", async () => {
    stop = startAdmin(3);
    await flushPolicyFetch();
    expect(
      (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn,
    ).toBeTypeOf("function");

    stop();
    stop = undefined;
    logout.mockClear();

    expect(
      (window as unknown as { __datagateStaySignedIn?: () => void }).__datagateStaySignedIn,
    ).toBeUndefined();

    vi.advanceTimersByTime(10 * 60_000);
    expect(logout).not.toHaveBeenCalled();
  });

  it("throttles activity heartbeats to 30 seconds", async () => {
    stop = startAdmin(5);
    await flushPolicyFetch();
    postActivity.mockClear();

    window.dispatchEvent(new Event("keydown"));
    expect(postActivity).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("keydown"));
    expect(postActivity).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_000);
    window.dispatchEvent(new Event("keydown"));
    expect(postActivity).toHaveBeenCalledTimes(2);
  });
});

describe("adminIdleSessionEvents", () => {
  it("dispatches policy-changed event", () => {
    const spy = vi.fn();
    window.addEventListener(ADMIN_IDLE_POLICY_CHANGED_EVENT, spy);
    notifyAdminIdlePolicyChanged();
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(ADMIN_IDLE_POLICY_CHANGED_EVENT, spy);
  });
});
