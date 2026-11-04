import { Suspense } from "react";
import type { ReactElement } from "react";
import { LoadingOverlay } from "../components/ui/LoadingOverlay.tsx";

/** Lazy-route boundary: fallback stays inside the outlet, not over the shell/nav. */
export function withSuspense(node: ReactElement) {
  return <Suspense fallback={<LoadingOverlay />}>{node}</Suspense>;
}
