import { describe, expect, it } from "vitest";
import { humanizeSignalRStatusStreamError } from "./signalrFriendlyError";

describe("humanizeSignalRStatusStreamError", () => {
  it("returns empty for blank input", () => {
    expect(humanizeSignalRStatusStreamError(null)).toBe("");
    expect(humanizeSignalRStatusStreamError("")).toBe("");
  });

  it("humanizes sticky-session / scale-out errors", () => {
    const msg = humanizeSignalRStatusStreamError(
      "The connection id is not present on the server (sticky sessions?)",
    );
    expect(msg).toMatch(/Live status stream/i);
    expect(msg).toMatch(/sticky sessions/i);
  });

  it("humanizes websocket transport failures", () => {
    const msg = humanizeSignalRStatusStreamError(
      "WebSocket failed to connect to the hub transport",
    );
    expect(msg).toMatch(/WebSocket to \/api\/hubs\/status-stream failed/i);
  });

  it("passes through unknown errors", () => {
    expect(humanizeSignalRStatusStreamError("totally custom")).toBe("totally custom");
  });
});
