import { describe, expect, it } from "vitest";
import { Suspense, lazy, type ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { withSuspense } from "./withSuspense";

describe("withSuspense", () => {
  it("shows a scoped LoadingOverlay while a lazy child is pending", async () => {
    let resolveImport: ((mod: { default: () => ReactElement }) => void) | undefined;
    const LazyPage = lazy(
      () =>
        new Promise<{ default: () => ReactElement }>((resolve) => {
          resolveImport = resolve;
        }),
    );

    render(withSuspense(<LazyPage />));

    const status = await screen.findByRole("status");
    expect(status).toHaveStyle({ position: "relative" });
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    resolveImport?.({ default: () => <div data-testid="lazy-ready">ready</div> });
    await waitFor(() => {
      expect(screen.getByTestId("lazy-ready")).toBeInTheDocument();
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("uses Suspense (regression: route chunks must not paint an unscoped overlay)", () => {
    const tree = withSuspense(<div>ok</div>);
    expect(tree.type).toBe(Suspense);
  });
});
