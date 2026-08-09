import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStabilizedRowCount } from "./useStabilizedRowCount";

describe("useStabilizedRowCount", () => {
  it("keeps the previous count while next is undefined", () => {
    const { result, rerender } = renderHook(
      ({ next }) => useStabilizedRowCount(next),
      { initialProps: { next: 40 as number | undefined } },
    );
    expect(result.current).toBe(40);

    rerender({ next: undefined });
    expect(result.current).toBe(40);
  });

  it("accepts a real zero total", () => {
    const { result, rerender } = renderHook(
      ({ next }) => useStabilizedRowCount(next),
      { initialProps: { next: 12 as number | undefined } },
    );
    rerender({ next: 0 });
    expect(result.current).toBe(0);
  });

  it("resets when resetKey changes", () => {
    const { result, rerender } = renderHook(
      ({ next, key }) => useStabilizedRowCount(next, key),
      { initialProps: { next: 40 as number | undefined, key: "a" } },
    );
    expect(result.current).toBe(40);

    rerender({ next: undefined, key: "b" });
    expect(result.current).toBe(0);

    rerender({ next: 7, key: "b" });
    expect(result.current).toBe(7);
  });
});
