import type { GetApiNotificationsGetAllParams } from "../api/orval/model";

/**
 * Serializes notification list query params for ASP.NET model binding:
 * repeated keys `Severities=0&Severities=1`, PascalCase matches OpenAPI.
 */
export function serializeNotificationsGetAllParams(
  params: Record<string, unknown> | undefined,
): string {
  const sp = new URLSearchParams();
  if (!params || typeof params !== "object") return sp.toString();

  const p = params as GetApiNotificationsGetAllParams;

  if (p.Page != null) sp.set("Page", String(p.Page));
  if (p.PageSize != null) sp.set("PageSize", String(p.PageSize));
  if (p.IsRead !== undefined) sp.set("IsRead", p.IsRead ? "true" : "false");

  const type = p.Type?.trim();
  if (type) sp.set("Type", type.slice(0, 256));

  if (Array.isArray(p.Severities) && p.Severities.length > 0) {
    for (const s of p.Severities) {
      sp.append("Severities", String(s));
    }
  }

  return sp.toString();
}
