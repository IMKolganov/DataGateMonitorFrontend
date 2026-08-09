import { describe, expect, it } from "vitest";
import { normalizeOpenVpnEventsPage } from "./normalizeOpenVpnEventsPage";

describe("normalizeOpenVpnEventsPage", () => {
  it("reads nested events page wrapper", () => {
    const page = normalizeOpenVpnEventsPage({
      events: { items: [{ id: 1 }], totalCount: 5, page: 2, pageSize: 10 },
    } as never);
    expect(page.totalCount).toBe(5);
    expect(page.items).toHaveLength(1);
    expect(page.page).toBe(2);
  });

  it("accepts bare arrays", () => {
    const page = normalizeOpenVpnEventsPage([{ id: 1 }, { id: 2 }] as never);
    expect(page.items).toHaveLength(2);
    expect(page.totalCount).toBe(2);
  });
});
