import { useState } from "react";
import { stabilizeRowCount } from "../utils/gridPageSelection";

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
  const [state, setState] = useState(() => ({
    key: resetKey,
    count: typeof next === "number" && Number.isFinite(next) && next >= 0 ? next : 0,
  }));

  if (state.key !== resetKey) {
    const initial =
      typeof next === "number" && Number.isFinite(next) && next >= 0 ? next : 0;
    setState({ key: resetKey, count: initial });
    return initial;
  }

  const stabilized = stabilizeRowCount(state.count, next);
  if (stabilized !== state.count) {
    setState({ key: resetKey, count: stabilized });
  }
  return stabilized;
}
