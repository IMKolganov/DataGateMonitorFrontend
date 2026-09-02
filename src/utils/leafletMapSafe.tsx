import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type L from "leaflet";

/** True when the map container is still attached to the document. */
export function isMapContainerConnected(map: L.Map): boolean {
    const el = map.getContainer();
    return Boolean(el?.isConnected);
}

/** Run a Leaflet call only while the map DOM is mounted; swallow teardown races. */
export function safeMapCall(map: L.Map, fn: () => void): void {
    if (!isMapContainerConnected(map)) return;
    try {
        fn();
    } catch {
        /* map unmounting mid-zoom — avoids Leaflet _leaflet_pos on torn panes */
    }
}

/**
 * Stop in-flight pan/zoom animations before React removes the map container.
 * Prevents `_onZoomTransitionEnd` from reading `_leaflet_pos` on detached panes.
 */
export function LeafletMapLifecycle(): null {
    const map = useMap();

    useEffect(() => {
        return () => {
            try {
                map.stop();
            } catch {
                /* map already removed */
            }
        };
    }, [map]);

    return null;
}
