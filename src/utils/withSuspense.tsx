import { Suspense } from "react";
import type { ReactElement } from "react";
import { LoadingOverlay } from "../components/ui/LoadingOverlay.tsx";

export function withSuspense(node: ReactElement) {
  return <Suspense fallback={<LoadingOverlay />}>{node}</Suspense>;
}
