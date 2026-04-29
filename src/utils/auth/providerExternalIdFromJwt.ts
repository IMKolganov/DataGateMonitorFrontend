/** .NET ClaimTypes.NameIdentifier — dashboard numeric user id, not Google/Telegram id. */
const NAME_IDENTIFIER_CLAIM =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";

function firstNonEmptyString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

/**
 * OAuth / provider user id for traffic and issued files (Google `sub`, Telegram id, …).
 * The access JWT from DataGateMonitor includes claim `externalId` (see backend TokenService).
 * Do not use `sub` / `nameid` alone for Xray/OpenVPN `externalId` — those are the internal DB user id.
 */
export function providerExternalIdFromJwtClaims(claims: Record<string, unknown>): string {
  const fromDedicated = firstNonEmptyString(claims, [
    "externalId",
    "external_id",
    "provider_external_id",
  ]);
  if (fromDedicated) return fromDedicated;

  return firstNonEmptyString(claims, ["nameid", "sub", NAME_IDENTIFIER_CLAIM]);
}
