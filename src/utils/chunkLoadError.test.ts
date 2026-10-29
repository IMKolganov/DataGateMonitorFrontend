import { describe, expect, it } from "vitest";
import { DYNAMIC_IMPORT_RELOAD_MIN_AGE_MS, looksLikeChunkLoadError } from "./chunkLoadError";

describe("looksLikeChunkLoadError", () => {
  it("treats webpack-style ChunkLoadError as reload-worthy", () => {
    expect(looksLikeChunkLoadError(new Error("ChunkLoadError: Loading chunk 7 failed"))).toBe(
      true,
    );
    expect(looksLikeChunkLoadError(new Error("Loading chunk 12 failed"))).toBe(true);
  });

  it("ignores Failed to fetch dynamically imported module right after boot (rapid nav)", () => {
    const boot = 1_000_000;
    const early = boot + 5_000;
    expect(
      looksLikeChunkLoadError(
        new TypeError("Failed to fetch dynamically imported module: https://x/assets/A.js"),
        early,
        boot,
      ),
    ).toBe(false);
    expect(
      looksLikeChunkLoadError("Failed to fetch dynamically imported module", early, boot),
    ).toBe(false);
  });

  it("treats Failed to fetch dynamically imported module as deploy after tab has aged", () => {
    const boot = 1_000_000;
    const aged = boot + DYNAMIC_IMPORT_RELOAD_MIN_AGE_MS + 1;
    expect(
      looksLikeChunkLoadError(
        new TypeError("Failed to fetch dynamically imported module: https://x/assets/A.js"),
        aged,
        boot,
      ),
    ).toBe(true);
  });

  it("ignores AbortError / CanceledError from rapid lazy-route switches", () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    expect(looksLikeChunkLoadError(abort)).toBe(false);

    const canceled = new Error("canceled");
    canceled.name = "CanceledError";
    expect(looksLikeChunkLoadError(canceled)).toBe(false);

    expect(looksLikeChunkLoadError({ name: "AbortError", message: "aborted" })).toBe(false);
    expect(looksLikeChunkLoadError({ name: "CanceledError", message: "canceled" })).toBe(false);
  });

  it("ignores abort/cancel text without a ChunkLoadError marker", () => {
    expect(looksLikeChunkLoadError(new Error("Fetch is aborted"))).toBe(false);
    expect(looksLikeChunkLoadError("Request canceled")).toBe(false);
    expect(looksLikeChunkLoadError("The user aborted a request")).toBe(false);
  });

  it("still reloads when ChunkLoadError text also mentions abort", () => {
    expect(
      looksLikeChunkLoadError(new Error("ChunkLoadError: Loading chunk 3 failed (aborted)")),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(looksLikeChunkLoadError(new Error("Network Error"))).toBe(false);
    expect(looksLikeChunkLoadError(null)).toBe(false);
    expect(looksLikeChunkLoadError(undefined)).toBe(false);
    expect(looksLikeChunkLoadError(42)).toBe(false);
  });
});
