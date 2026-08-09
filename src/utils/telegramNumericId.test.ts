import { describe, expect, it } from "vitest";
import { parseTelegramNumericId, telegramPhotoIdForProvider } from "./telegramNumericId";

describe("telegramNumericId", () => {
  it("parses safe positive telegram ids", () => {
    expect(parseTelegramNumericId("12345")).toBe(12345);
    expect(parseTelegramNumericId("abc")).toBeUndefined();
    expect(parseTelegramNumericId(-1)).toBeUndefined();
  });

  it("only returns photo id for telegram providers", () => {
    expect(telegramPhotoIdForProvider("Telegram", "99999")).toBe(99999);
    expect(telegramPhotoIdForProvider("Google", "99999")).toBeUndefined();
  });
});
