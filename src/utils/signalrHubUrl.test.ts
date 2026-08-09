import { describe, expect, it, vi } from "vitest";

vi.mock("../config/apiBase", () => ({ getApiBaseUrl: () => "https://api.example/api" }));

import { getProxyTrafficFlowHubUrl, getStatusStreamHubUrl } from "./signalrHubUrl";

describe("signalrHubUrl", () => {
  it("builds status-stream and proxy-traffic-flow hub urls from api base", () => {
    expect(getStatusStreamHubUrl()).toBe("https://api.example/api/hubs/status-stream");
    expect(getProxyTrafficFlowHubUrl()).toBe("https://api.example/api/hubs/proxy-traffic-flow");
  });
});
