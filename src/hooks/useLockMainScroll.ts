import { useEffect } from "react";

/**
 * Locks `.main-content` scrolling while a fullscreen modal/overlay is open.
 * Body already uses overflow:hidden; page scroll lives on main.
 */
export function useLockMainScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const main = document.querySelector(".main-content");
    if (!(main instanceof HTMLElement)) return;

    const previous = main.style.overflowY;
    main.style.overflowY = "hidden";
    return () => {
      main.style.overflowY = previous;
    };
  }, [locked]);
}
