/**
 * Coordinates PrivateRoute with silent refresh on startup (refresh-only storage).
 * PrivateRoute must wait until bootstrap settles before treating missing access as logout.
 */
let bootstrapPromise: Promise<void> | null = null;
let bootstrapSettled = true;

export function resetAuthBootstrapForTests(): void {
  bootstrapPromise = null;
  bootstrapSettled = true;
}

export function isAuthBootstrapPending(): boolean {
  return !bootstrapSettled;
}

export function whenAuthBootstrapSettled(): Promise<void> {
  return bootstrapPromise ?? Promise.resolve();
}

/**
 * Marks bootstrap in-flight. Resolves (and settles) when `work` completes.
 * Callers should pass the silent-refresh promise; arming with an existing access token
 * should call {@link markAuthBootstrapSettled} immediately instead.
 */
export function beginAuthBootstrap(work: Promise<unknown>): Promise<void> {
  bootstrapSettled = false;
  bootstrapPromise = Promise.resolve(work).then(
    () => undefined,
    () => undefined,
  ).finally(() => {
    bootstrapSettled = true;
  });
  return bootstrapPromise;
}

export function markAuthBootstrapSettled(): void {
  bootstrapSettled = true;
  bootstrapPromise = null;
}
