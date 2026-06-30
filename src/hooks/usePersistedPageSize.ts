import { useCallback, useState } from "react";
import { getUserScopedStorageKey } from "../utils/datagridUserStorage";

const PREFIX = "datagrid-pageSize";

function getScopedStorageKey(storageKey: string): string {
  return getUserScopedStorageKey(PREFIX, storageKey);
}

export function getStoredPageSize(
  storageKey: string,
  defaultSize: number,
  allowedOptions: readonly number[],
): number {
  try {
    const raw = localStorage.getItem(getScopedStorageKey(storageKey));
    if (raw == null) return defaultSize;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) return defaultSize;
    if (allowedOptions.includes(n)) return n;
    return defaultSize;
  } catch {
    return defaultSize;
  }
}

export function setStoredPageSize(storageKey: string, pageSize: number): void {
  try {
    localStorage.setItem(getScopedStorageKey(storageKey), String(pageSize));
  } catch {
    // quota / private mode
  }
}

function optionsFromKey(allowedKey: string): number[] {
  return allowedKey
    .split(",")
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * Persists DataGrid "rows per page" in localStorage per logical table (`storageKey`).
 * When `storageKey` changes (e.g. another server), the value for that key is loaded.
 *
 * Pass a stable `allowedKey` such as `"5,10,20,50"` (sorted ascending) so options do not
 * depend on array identity across renders.
 */
export function usePersistedPageSize(
  storageKey: string,
  defaultPageSize: number,
  allowedKey: string,
): [number, (n: number) => void] {
  const allowedOptions = optionsFromKey(allowedKey);

  const [state, setState] = useState(() => ({
    storageKey,
    pageSize: getStoredPageSize(storageKey, defaultPageSize, allowedOptions),
  }));

  if (state.storageKey !== storageKey) {
    const opts = optionsFromKey(allowedKey);
    const pageSize = getStoredPageSize(storageKey, defaultPageSize, opts);
    setState({ storageKey, pageSize });
  }

  const setPageSize = useCallback(
    (n: number) => {
      const opts = optionsFromKey(allowedKey);
      const next = opts.includes(n) ? n : defaultPageSize;
      setState({ storageKey, pageSize: next });
      setStoredPageSize(storageKey, next);
    },
    [storageKey, defaultPageSize, allowedKey],
  );

  return [state.pageSize, setPageSize];
}
