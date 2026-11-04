import { describe, expect, it } from "vitest";
import {
  formatSessionDeviceLabel,
  formatUserAgent,
  getSessionActivityStatus,
  SESSION_ACTIVE_WITHIN_MS,
} from "./formatSessionDevice";

describe("formatUserAgent", () => {
  it("summarizes Chrome on Linux", () => {
    expect(
      formatUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome 153 on Linux");
  });

  it("summarizes Chrome on Android", () => {
    expect(
      formatUserAgent(
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe("Chrome 154 on Android");
  });

  it("labels native clients", () => {
    expect(formatUserAgent("DataGateWin/1.0 (Windows)")).toBe("DataGate for Windows");
    expect(formatUserAgent("DataGateMac/21 CFNetwork/3860.700.1 Darwin/25.6.0")).toBe(
      "DataGate for Mac",
    );
  });
});

describe("getSessionActivityStatus", () => {
  const now = Date.parse("2026-10-05T03:00:00.000Z");

  it("marks current session", () => {
    expect(
      getSessionActivityStatus(
        { isCurrent: true, createdAt: "2026-09-01T00:00:00.000Z" },
        now,
      ),
    ).toBe("current");
  });

  it("marks recently refreshed sessions as active", () => {
    const createdAt = new Date(now - SESSION_ACTIVE_WITHIN_MS / 2).toISOString();
    expect(getSessionActivityStatus({ isCurrent: false, createdAt }, now)).toBe("active");
  });

  it("marks stale sessions as idle", () => {
    const createdAt = new Date(now - SESSION_ACTIVE_WITHIN_MS - 1).toISOString();
    expect(getSessionActivityStatus({ isCurrent: false, createdAt }, now)).toBe("idle");
  });
});

describe("formatSessionDeviceLabel", () => {
  it("prefers user agent summary", () => {
    expect(
      formatSessionDeviceLabel({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/154.0.0.0 Safari/537.36",
        deviceId: "abc",
      }),
    ).toBe("Chrome 154 on Windows");
  });
});
