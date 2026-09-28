import { useState } from "react";
import { stabilizeRowCount } from "../utils/gridPageSelection";

type StabilizedState = {
  key: string | number;
  count: number;
  /** Ignore this finite total until the query clears or returns a different value. */
  staleTotal: number | null;
};

/**
 * Keeps the last known server `rowCount` while the query briefly returns
 * `undefined`/`null` (typical during page changes). Prevents MUI DataGrid
 * server pagination from snapping back to page 0.
 *
 * Pass the raw `totalCount` from the API **before** coalescing with `?? 0`.
 * `resetKey` clears the remembered count when the dataset identity changes
 * (server id, live/history mode, etc.).
 */
export function useStabilizedRowCount(
  next: number | null | undefined,
  resetKey: string | number = 0,
): number {
  const [state, setState] = useState<StabilizedState>(() => ({
    key: resetKey,
    count: typeof next === "number" && Number.isFinite(next) && next >= 0 ? next : 0,
    staleTotal: null,
  }));

  if (state.key !== resetKey) {
    const stale =
      typeof next === "number" && Number.isFinite(next) && next >= 0 ? next : null;
    setState({ key: resetKey, count: 0, staleTotal: stale });
    return 0;
  }

  if (state.staleTotal != null) {
    if (next == null || !Number.isFinite(next)) {
      setState({ key: resetKey, count: 0, staleTotal: null });
      return 0;
    }
    if (next === state.staleTotal) {
      // Still the previous dataset's total (caller has not cleared yet).
      return 0;
    }
    setState({ key: resetKey, count: next, staleTotal: null });
    return next;
  }

  const stabilized = stabilizeRowCount(state.count, next);
  if (stabilized !== state.count) {
    setState({ key: resetKey, count: stabilized, staleTotal: null });
  }
  return stabilized;
}
