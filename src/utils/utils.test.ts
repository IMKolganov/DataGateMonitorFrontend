import { describe, expect, it } from "vitest";
import { formatBytes, formatDateWithOffset } from "./utils";

describe("utils formatters", () => {
  it("formats bytes with binary units", () => {
    expect(formatBytes(undefined)).toBe("0 Bytes");
    expect(formatBytes(1024)).toMatch(/1\.0 KiB/);
  });

  it("formats date with timezone offset", () => {
    const s = formatDateWithOffset(new Date("2024-01-01T12:00:00.000Z"));
    expect(s).toMatch(/2024-01-01 12:00:00/);
  });
});
