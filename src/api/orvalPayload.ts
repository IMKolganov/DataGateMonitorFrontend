/**
 * Orval typings use Api* envelopes; ogmMutator unwraps ApiResponse at runtime.
 * Use this at app boundaries when passing results to code typed with inner models.
 */
export function orvalPayload<T>(value: { data?: T } | T | null | undefined): T {
  if (value == null) {
    throw new Error("Empty API response.");
  }

  if (
    typeof value === "object" &&
    "data" in value &&
    "success" in value
  ) {
    const wrapped = value as { data?: T };
    if (wrapped.data !== undefined) {
      return wrapped.data;
    }
  }

  return value as T;
}
