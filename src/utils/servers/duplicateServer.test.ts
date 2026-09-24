import { describe, expect, it } from "vitest";
import {
  buildDuplicatedServerName,
  duplicateServerPath,
  parseDuplicateFromParam,
} from "./duplicateServer";

describe("duplicateServer", () => {
  it("builds add path with duplicateFrom query", () => {
    expect(duplicateServerPath(42)).toBe("/servers/add?duplicateFrom=42");
  });

  it("parses duplicateFrom query", () => {
    expect(parseDuplicateFromParam("7")).toBe(7);
    expect(parseDuplicateFromParam("0")).toBe(0);
    expect(parseDuplicateFromParam("abc")).toBe(0);
    expect(parseDuplicateFromParam(null)).toBe(0);
  });

  it("appends (copy) to server names", () => {
    expect(buildDuplicatedServerName("sto-4")).toBe("sto-4 (copy)");
    expect(buildDuplicatedServerName("sto-4 (copy)")).toBe("sto-4 (copy)");
    expect(buildDuplicatedServerName("")).toBe("Server (copy)");
  });
});
