import { useRef, type ReactElement } from "react";
import { useLocation, useOutlet } from "react-router-dom";

type Props = {
  /** Max cached route panes (LRU). Heavy settings grids stay mounted. */
  maxEntries?: number;
};

/**
 * Keeps recently visited outlet trees mounted (hidden) so rapid tab switches
 * do not remount MUI DataGrid — that remount was freezing cert-expiry ↔ telegrambot.
 */
export function KeepAliveOutlet({ maxEntries = 8 }: Props) {
  const outlet = useOutlet();
  const { pathname } = useLocation();
  const cacheRef = useRef(new Map<string, ReactElement>());
  const orderRef = useRef<string[]>([]);

  if (outlet && !cacheRef.current.has(pathname)) {
    cacheRef.current.set(pathname, outlet);
    orderRef.current = [pathname, ...orderRef.current.filter((p) => p !== pathname)];
    while (orderRef.current.length > maxEntries) {
      const drop = orderRef.current.pop();
      if (drop) cacheRef.current.delete(drop);
    }
  } else if (outlet && cacheRef.current.has(pathname)) {
    // Touch LRU order without replacing the mounted element.
    orderRef.current = [pathname, ...orderRef.current.filter((p) => p !== pathname)];
  }

  const entries = orderRef.current
    .map((path) => {
      const el = cacheRef.current.get(path);
      return el ? ([path, el] as const) : null;
    })
    .filter((x): x is readonly [string, ReactElement] => x != null);

  return (
    <>
      {entries.map(([path, el]) => {
        const active = path === pathname;
        return (
          <div
            key={path}
            className="keepalive-outlet-pane"
            hidden={!active}
            aria-hidden={!active}
            // display:none keeps layout cheap; tree stays mounted.
            style={active ? undefined : { display: "none" }}
          >
            {el}
          </div>
        );
      })}
    </>
  );
}

export default KeepAliveOutlet;
