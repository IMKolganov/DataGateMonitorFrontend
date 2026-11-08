import axios from "axios";
import { describe, expect, it } from "vitest";
import { appVersion } from "../version";
import {
  CLIENT_NAME_HEADER,
  CLIENT_VERSION_HEADER,
  installClientIdentityHeaders,
  withClientIdentityQuery,
} from "./clientIdentity";

describe("clientIdentity", () => {
  it("sets frontend name and app version on every axios request", () => {
    installClientIdentityHeaders();
    expect(axios.defaults.headers.common[CLIENT_NAME_HEADER]).toBe("frontend");
    expect(axios.defaults.headers.common[CLIENT_VERSION_HEADER]).toBe(appVersion);
    expect(appVersion).toBeTruthy();
  });

  it("appends identity to hub urls with and without an existing query", () => {
    const v = encodeURIComponent(appVersion);
    expect(withClientIdentityQuery("/api/hubs/status-stream")).toBe(
      `/api/hubs/status-stream?clientName=frontend&clientVersion=${v}`,
    );
    expect(withClientIdentityQuery("/api/hubs/frontend?serverId=4")).toBe(
      `/api/hubs/frontend?serverId=4&clientName=frontend&clientVersion=${v}`,
    );
  });
});
