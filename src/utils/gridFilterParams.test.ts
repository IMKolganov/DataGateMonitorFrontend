import { describe, expect, it } from "vitest";
import { gridFilterToQueryParams } from "./gridFilterParams";
import type { GridFilterField } from "../components/ui/GridFilterBar";

const fields: GridFilterField[] = [
  { id: "search", label: "Search", param: "Search" },
  { id: "externalId", label: "External ID", param: "ExternalId" },
  { id: "isAdmin", label: "Admin", param: "IsAdmin", type: "select", options: [] },
  { id: "telegramId", label: "Telegram ID", param: "TelegramId", type: "number" },
];

describe("gridFilterToQueryParams", () => {
  it("maps non-empty text and select values to PascalCase params", () => {
    const params = gridFilterToQueryParams(fields, {
      search: "  bob  ",
      externalId: "",
      isAdmin: "true",
      telegramId: "",
    });

    expect(params).toEqual({ Search: "bob", IsAdmin: true });
  });

  it("parses numeric fields and ignores invalid numbers", () => {
    const params = gridFilterToQueryParams(fields, {
      search: "",
      externalId: "",
      isAdmin: "",
      telegramId: "12345",
    });

    expect(params).toEqual({ TelegramId: 12345 });
  });

  it("skips fields without param mapping", () => {
    const localOnly: GridFilterField[] = [{ id: "name", label: "Name" }];
    expect(gridFilterToQueryParams(localOnly, { name: "plan-a" })).toEqual({});
  });
});
