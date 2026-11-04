import { afterEach, describe, expect, it } from "vitest";
import { installNativeDragGuard, shouldAllowNativeDrag } from "./nativeDragGuard";

function fireDragStart(el: Element): Event {
  const ev = new Event("dragstart", { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return ev;
}

describe("nativeDragGuard", () => {
  let uninstall: (() => void) | null = null;

  afterEach(() => {
    uninstall?.();
    uninstall = null;
    document.body.innerHTML = "";
  });

  it("blocks default drag on links and images", () => {
    uninstall = installNativeDragGuard();
    const a = document.createElement("a");
    a.href = "/settings/general";
    a.textContent = "General";
    const img = document.createElement("img");
    document.body.append(a, img);

    expect(fireDragStart(a).defaultPrevented).toBe(true);
    expect(fireDragStart(img).defaultPrevented).toBe(true);
  });

  it("keeps drag for elements that opt in with draggable=true (and their children)", () => {
    uninstall = installNativeDragGuard();
    const header = document.createElement("div");
    header.setAttribute("draggable", "true");
    const label = document.createElement("span");
    label.textContent = "Column";
    header.appendChild(label);
    document.body.appendChild(header);

    expect(fireDragStart(header).defaultPrevented).toBe(false);
    expect(fireDragStart(label).defaultPrevented).toBe(false);
  });

  it("shouldAllowNativeDrag handles non-element targets", () => {
    expect(shouldAllowNativeDrag(null)).toBe(false);
    expect(shouldAllowNativeDrag(document.createTextNode("x"))).toBe(false);
  });

  it("uninstall stops intercepting", () => {
    const stop = installNativeDragGuard();
    stop();
    const a = document.createElement("a");
    document.body.appendChild(a);
    expect(fireDragStart(a).defaultPrevented).toBe(false);
  });
});
