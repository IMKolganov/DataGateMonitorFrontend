/** Safe same-app path for post-login redirect (blocks open redirects). */
export function sanitizeReturnPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("://")) {
    return fallback;
  }
  return decoded;
}

export function loginUrlWithReturn(returnPath: string): string {
  const safe = sanitizeReturnPath(returnPath, "/tv/link");
  return `/login?redirect=${encodeURIComponent(safe)}`;
}

export function readRedirectFromSearch(search: string, fallback = "/"): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return sanitizeReturnPath(params.get("redirect") ?? params.get("returnUrl"), fallback);
}
