import { describe, expect, it } from "vitest";
import {
  axiosResponseDataMessage,
  axiosResponseDetail,
  errorMessage,
  formatApiErrorPayload,
} from "./errorMessage";

describe("errorMessage helpers", () => {
  it("reads message and detail from payloads", () => {
    expect(axiosResponseDataMessage({ message: "hi" })).toBe("hi");
    expect(axiosResponseDetail({ detail: " db " })).toBe("db");
  });

  it("prefers detail when message is a generic API wrapper", () => {
    expect(
      formatApiErrorPayload({ message: "Internal server error", detail: "db down" }),
    ).toBe("db down");
  });

  it("returns Error.message for thrown Errors", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });
});
