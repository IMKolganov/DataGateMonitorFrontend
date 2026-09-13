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

  it("keeps the previous count while next is null", () => {
    const { result, rerender } = renderHook(
      ({ next }) => useStabilizedRowCount(next),
      { initialProps: { next: 15 as number | null | undefined } },
    );
    rerender({ next: null });
    expect(result.current).toBe(15);
  });

  it("accepts a real zero total", () => {
    const { result, rerender } = renderHook(
      ({ next }) => useStabilizedRowCount(next),
      { initialProps: { next: 12 as number | undefined } },
    );
    rerender({ next: 0 });
    expect(result.current).toBe(0);
  });

  it("resets to 0 when resetKey changes even if next still holds the old total", () => {
    const { result, rerender } = renderHook(
      ({ next, key }) => useStabilizedRowCount(next, key),
      { initialProps: { next: 40 as number | undefined, key: "a" as string } },
    );
    expect(result.current).toBe(40);

    // Caller has not cleared local totalCount yet — must not keep 40 for the new dataset.
    rerender({ next: 40, key: "b" });
    expect(result.current).toBe(0);

    rerender({ next: undefined, key: "b" });
    expect(result.current).toBe(0);

    rerender({ next: 7, key: "b" });
    expect(result.current).toBe(7);
  });

  it("accepts a new total equal to the old one after the query cleared", () => {
    const { result, rerender } = renderHook(
      ({ next, key }) => useStabilizedRowCount(next, key),
      { initialProps: { next: 40 as number | undefined, key: "a" as string } },
    );

    rerender({ next: 40, key: "b" });
    expect(result.current).toBe(0);

    rerender({ next: undefined, key: "b" });
    rerender({ next: 40, key: "b" });
    expect(result.current).toBe(40);
  });

  it("starts at 0 when first rendered with undefined", () => {
    const { result } = renderHook(() => useStabilizedRowCount(undefined, "x"));
    expect(result.current).toBe(0);
  });
});
