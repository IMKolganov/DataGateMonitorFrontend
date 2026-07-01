import type { VpnServerEventLogDto } from "../../api/orvalModelShim";
import type { getApiOpenVpnEventsGetByServer } from "../../api/orval/vpn-server-event/vpn-server-event";

export type OpenVpnEventsPageResponse = Awaited<ReturnType<typeof getApiOpenVpnEventsGetByServer>>;

export type NormalizedOpenVpnEvents<TItem = VpnServerEventLogDto> = {
  items: TItem[];
  totalCount: number;
  page?: number;
  pageSize?: number;
};

/** Normalize ogmMutator output from get-by-server (events paged wrapper or legacy shapes). */
export function normalizeOpenVpnEventsPage<TItem = VpnServerEventLogDto>(
  raw: OpenVpnEventsPageResponse | undefined | null,
): NormalizedOpenVpnEvents<TItem> {
  const rawU: unknown = raw ?? {};
  const events: unknown = Array.isArray(rawU)
    ? rawU
    : (rawU as Record<string, unknown>)["events"] ?? rawU;

  const topRec =
    !Array.isArray(rawU) && rawU !== null && typeof rawU === "object"
      ? (rawU as Record<string, unknown>)
      : null;

  const items: unknown[] = (() => {
    if (events !== null && typeof events === "object" && !Array.isArray(events)) {
      const ev = events as Record<string, unknown>;
      if (Array.isArray(ev["items"])) return ev["items"] as unknown[];
    }
    if (Array.isArray(events)) return events;
    if (topRec && Array.isArray(topRec["items"])) return topRec["items"] as unknown[];
    if (Array.isArray(rawU)) return rawU;
    return [];
  })();

  const evRec =
    events !== null && typeof events === "object" && !Array.isArray(events)
      ? (events as Record<string, unknown>)
      : null;

  const totalCount: number =
    (typeof evRec?.["totalCount"] === "number" ? evRec["totalCount"] : undefined) ??
    (typeof topRec?.["totalCount"] === "number" ? topRec["totalCount"] : undefined) ??
    items.length;

  const page: number | undefined =
    typeof evRec?.["page"] === "number"
      ? evRec["page"]
      : typeof topRec?.["page"] === "number"
        ? topRec["page"]
        : undefined;

  const pageSize: number | undefined =
    typeof evRec?.["pageSize"] === "number"
      ? evRec["pageSize"]
      : typeof topRec?.["pageSize"] === "number"
        ? topRec["pageSize"]
        : undefined;

  return { items: items as TItem[], totalCount, page, pageSize };
}
