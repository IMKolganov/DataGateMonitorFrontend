/**
 * React Query / Axios cancel leaves "canceled" error.
 * Do not show it to the user or retry.
 */
export function isCanceledError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === "CanceledError" || error.message === "canceled";
  }
  if (error && typeof error === "object" && "name" in error) {
    return (error as { name?: string }).name === "CanceledError";
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message) === "canceled";
  }
  return false;
}
