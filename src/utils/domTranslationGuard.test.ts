import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { installDomTranslationGuard } from "./domTranslationGuard";

describe("installDomTranslationGuard", () => {
  beforeEach(() => {
    const g = globalThis as typeof globalThis & { __domTranslationGuardInstalled?: boolean };
    delete g.__domTranslationGuardInstalled;
    installDomTranslationGuard();
  });

  afterEach(() => {
    // Guard patches prototypes once; leave installed for other tests in this file only.
  });

  it("insertBefore appends when reference node was re-parented", () => {
    const parent = document.createElement("div");
    const anchor = document.createTextNode("a");
    const moved = document.createElement("span");
    parent.appendChild(anchor);
    moved.appendChild(anchor);

    const next = document.createElement("b");
    expect(() => parent.insertBefore(next, anchor)).not.toThrow();
    expect(parent.contains(next)).toBe(true);
  });

  it("removeChild no-ops when child is no longer under parent", () => {
    const parent = document.createElement("div");
    const child = document.createTextNode("x");
    parent.appendChild(child);
    const other = document.createElement("span");
    other.appendChild(child);

    expect(() => parent.removeChild(child)).not.toThrow();
    expect(other.contains(child)).toBe(false);
  });
});
