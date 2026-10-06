import { describe, expect, it } from "vitest";
import { EnumsDeliveryStatus } from "../../api/orval/model";
import {
  DELIVERY_ERROR_PREVIEW_LENGTH,
  formatDeliveryLine,
  formatNotificationMessage,
  parseKvMessage,
  truncateOneLine,
} from "./notificationMessageFormat";

describe("notificationMessageFormat", () => {
  it("leaves BadHttpRequestException messages as plain text (no JSON parse)", () => {
    const raw =
      "Microsoft.AspNetCore.Server.Kestrel.Core.BadHttpRequestException: Unexpected end of request content.";
    expect(formatNotificationMessage("proxy.error", raw)).toBe(raw);
    expect(parseKvMessage(raw)).toEqual({});
  });

  it("truncateOneLine collapses whitespace and caps length (telegram/message cells)", () => {
    const raw = `line1\n\nline2 ${"x".repeat(200)}`;
    const out = truncateOneLine(raw, 40);
    expect(out.includes("\n")).toBe(false);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith("…")).toBe(true);
  });

  it("compacts exception stacks in delivery cells so autoHeight cannot explode", () => {
    const stack = [
      "Microsoft.AspNetCore.Server.Kestrel.Core.BadHttpRequestException: Unexpected end of request content.",
      "   at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http.Http1ContentLengthMessageBody.ReadAsyncInternal()",
      "   at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http.HttpProtocol.ProcessRequests()",
    ].join("\n");

    const compact = formatDeliveryLine(
      { channel: "web", status: EnumsDeliveryStatus.NUMBER_2, error: stack },
      "compact",
    );
    const full = formatDeliveryLine(
      { channel: "web", status: EnumsDeliveryStatus.NUMBER_2, error: stack },
      "full",
    );

    expect(compact.length).toBeLessThan(120);
    expect(compact).toContain("BadHttpRequestException");
    expect(compact.endsWith("…)") || compact.includes("…")).toBe(true);
    expect(full.length).toBeGreaterThan(DELIVERY_ERROR_PREVIEW_LENGTH);
    expect(full).toContain("ReadAsyncInternal");
  });

  it("still formats known FileId/FileName dumps", () => {
    expect(
      formatNotificationMessage(
        "ovpn.file",
        "FileId=12; FileName=alice.ovpn; ExternalId=tg:1; DisplayName=Alice",
      ),
    ).toBe("Alice (tg:1) · alice.ovpn (file #12)");
  });
});
