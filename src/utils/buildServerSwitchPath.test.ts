import { describe, expect, it } from "vitest";
import { buildServerSwitchPath } from "./buildServerSwitchPath";

describe("buildServerSwitchPath", () => {
  it("defaults admin vs non-admin when pathname is not a server route", () => {
    expect(buildServerSwitchPath(3, "/elsewhere", true)).toBe("/servers/3/");
    expect(buildServerSwitchPath(3, "/elsewhere", false)).toBe("/servers/3/statistics");
  });

  it("preserves the current server tab", () => {
    expect(buildServerSwitchPath(9, "/servers/2/events", true)).toBe("/servers/9/events");
    expect(buildServerSwitchPath(9, "/servers/2/", false)).toBe("/servers/9/statistics");
  });
});
