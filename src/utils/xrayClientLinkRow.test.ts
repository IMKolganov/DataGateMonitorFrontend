import { describe, expect, it } from "vitest";
import { readIssuedXrayClientLinkMeta, unwrapXrayClientLinkRow } from "./xrayClientLinkRow";

describe("unwrapXrayClientLinkRow", () => {
  it("returns a flat dto", () => {
    expect(unwrapXrayClientLinkRow({ id: 3, commonName: "cn" })?.id).toBe(3);
  });

  it("unwraps issuedXrayClientLink", () => {
    expect(unwrapXrayClientLinkRow({ issuedXrayClientLink: { id: 8, commonName: "a" } })?.id).toBe(8);
  });

  it("falls back to issuedOvpnFile for old payloads", () => {
    expect(unwrapXrayClientLinkRow({ issuedOvpnFile: { id: 2, commonName: "old" } })?.id).toBe(2);
  });
});

describe("readIssuedXrayClientLinkMeta", () => {
  it("reads vpnServerId and commonName from issuedXrayClientLink", () => {
    expect(
      readIssuedXrayClientLinkMeta({
        issuedXrayClientLink: { vpnServerId: 12, commonName: "xray-user" },
      }),
    ).toEqual({ vpnServerId: 12, commonName: "xray-user" });
  });

  it("unwraps nested ApiResponse data", () => {
    expect(
      readIssuedXrayClientLinkMeta({
        data: { issuedXrayClientLink: { vpnServerId: 4, commonName: "nested" } },
      }),
    ).toEqual({ vpnServerId: 4, commonName: "nested" });
  });
});
