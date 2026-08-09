import { describe, expect, it } from "vitest";
import { serializeNotificationsGetAllParams } from "./notificationsQuerySerialize";

describe("serializeNotificationsGetAllParams", () => {
  it("serializes page filters and repeated severities", () => {
    const q = serializeNotificationsGetAllParams({
      Page: 2,
      PageSize: 20,
      IsRead: false,
      Type: "system",
      Severities: [0, 2],
    });
    expect(q).toContain("Page=2");
    expect(q).toContain("PageSize=20");
    expect(q).toContain("IsRead=false");
    expect(q).toContain("Type=system");
    expect(q).toContain("Severities=0");
    expect(q).toContain("Severities=2");
  });

  it("returns empty string for missing params", () => {
    expect(serializeNotificationsGetAllParams(undefined)).toBe("");
  });
});
