import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingOverlay } from "./LoadingOverlay";

describe("LoadingOverlay", () => {
  it("keeps the dimmed layer inside a relative host (not the viewport)", () => {
    render(<LoadingOverlay />);

    const host = screen.getByRole("status");
    expect(host).toHaveStyle({ position: "relative", width: "100%" });
    expect(host.style.minHeight).toBeTruthy();

    const layer = host.firstElementChild as HTMLElement | null;
    expect(layer).not.toBeNull();
    expect(layer).toHaveStyle({ position: "absolute" });
    // Absolute child must not be a direct body/viewport cover — it lives under the host.
    expect(host.contains(layer!)).toBe(true);
    expect(document.body.children).not.toContain(layer);
  });

  it("does not use position:fixed (that blocked the whole app on Suspense)", () => {
    const { container } = render(<LoadingOverlay />);
    const positioned = Array.from(container.querySelectorAll("*")).filter((el) => {
      const style = (el as HTMLElement).style;
      return style.position === "fixed";
    });
    expect(positioned).toHaveLength(0);
  });
});
