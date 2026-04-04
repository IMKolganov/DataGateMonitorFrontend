// src/components/GeoPointsMap.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Cookies from "js-cookie";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import { toast } from "react-toastify";

import { getApiOpenVpnClientsOverviewPoints } from "../../api/orval/open-vpn-server-clients/open-vpn-server-clients.ts";
import type {
    GeoPointAggDto,
    GetApiOpenVpnClientsOverviewPointsParams,
} from "../../api/orval/model";

type GeoPointsMapProps = {
    from: Date | string;
    to: Date | string;
    vpnServerId?: number | null;
    externalId?: string | null;
    onlyWithCoordinates?: boolean;
    center?: [number, number];
    zoom?: number;
    serverLocation?: [number, number] | null;
};

const MARKER_BASE =
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x";

const pointColorKeys = ["grey", "blue", "green", "orange", "red", "violet", "yellow", "black"] as const;
type PointColorKey = (typeof pointColorKeys)[number];

const createPointIcon = (color: PointColorKey): L.Icon =>
    L.icon({
        iconUrl: `${MARKER_BASE}-${color}.png`,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    });

const serverIcon = createPointIcon("blue");

const ICONS: Record<string, L.Icon> = Object.fromEntries(
    pointColorKeys.map((c) => [c, createPointIcon(c)])
);

// Thresholds (bytes) -> icon color
const ONE_MB = 1024 * 1024;
const FIFTY_MB = 50 * ONE_MB;
const ONE_GB = 1024 * ONE_MB;
const TEN_GB = 10 * ONE_GB;
const HUNDRED_GB = 100 * ONE_GB;
const FIVE_HUNDRED_GB = 500 * ONE_GB;

const tileLayers = {
    "Carto Dark": {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://carto.com/">Carto</a>',
    },
    "Carto Light": {
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://carto.com/">Carto</a>',
    },
    "Carto Voyager": {
        url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://carto.com/">Carto</a>',
    },
    OpenStreetMap: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    OpenTopoMap: {
        url: "https://tile.opentopomap.org/{z}/{x}/{y}.png",
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    },
    CyclOSM: {
        url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://www.cyclosm.org">CyclOSM</a>',
    },
    OpenRailwayMap: {
        url: "https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png",
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://www.openrailwaymap.org">OpenRailwayMap</a>',
    },
    "OPNVKarte (transport)": {
        url: "https://tileserver.memomaps.de/tilegen/{z}/{x}/{y}.png",
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; memomaps.de',
    },
    "Esri Dark Gray": {
        url:
            "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Tiles &copy; <a href="https://www.arcgis.com/">Esri</a>',
    },
    "Esri World Topo": {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Tiles &copy; <a href="https://www.arcgis.com/">Esri</a>',
    },
    "Esri World Imagery": {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Tiles &copy; <a href="https://www.arcgis.com/">Esri</a>',
    },
    "Google Maps": {
        url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        attribution:
            '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
    },
};

const ChangeView = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [map, center, zoom]);
    return null;
};

function formatBytes(value?: number | null, decimals = 1): string {
    if (!value || value <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    let i = 0;
    let n = value;
    while (n >= 1024 && i < units.length - 1) {
        n /= 1024;
        i++;
    }
    const d = i === 0 ? 0 : decimals;
    return `${n.toFixed(d)} ${units[i]}`;
}

function colorKeyForTraffic(totalBytes: number): PointColorKey {
    if (!totalBytes || totalBytes <= 0) return "grey";
    if (totalBytes <= ONE_MB) return "blue";
    if (totalBytes <= FIFTY_MB) return "green";
    if (totalBytes <= ONE_GB) return "orange";
    if (totalBytes <= TEN_GB) return "red";
    if (totalBytes <= HUNDRED_GB) return "violet";
    if (totalBytes <= FIVE_HUNDRED_GB) return "yellow";
    return "black";
}

// Ensure ISO8601 string for API
function toIso(v: Date | string): string {
    return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

// Try to pick array of points from different response shapes
function pickPoints(result: unknown): GeoPointAggDto[] {
    if (!result) return [];

    if (Array.isArray(result)) {
        return result as GeoPointAggDto[];
    }

    if (!isRecord(result)) return [];

    if (Array.isArray(result.data)) {
        return result.data as GeoPointAggDto[];
    }

    if (Array.isArray(result.items)) {
        return result.items as GeoPointAggDto[];
    }

    if (Array.isArray(result.result)) {
        return result.result as GeoPointAggDto[];
    }

    if (Array.isArray(result.geoPointAggs)) {
        return result.geoPointAggs as GeoPointAggDto[];
    }

    if (Array.isArray(result.points)) {
        return result.points as GeoPointAggDto[];
    }

    if (Array.isArray(result.geoPointAgg)) {
        return result.geoPointAgg as GeoPointAggDto[];
    }

    return [];
}

function isAbortError(e: unknown): boolean {
    if (!e || typeof e !== "object") return false;

    const err = e as { name?: string; code?: string; message?: string };
    return (
        err.name === "AbortError" ||
        err.name === "CanceledError" ||
        err.code === "ERR_CANCELED" ||
        err.message === "canceled"
    );
}

export const GeoPointsMap: React.FC<GeoPointsMapProps> = ({
                                                              from,
                                                              to,
                                                              vpnServerId,
                                                              externalId,
                                                              onlyWithCoordinates = true,
                                                              center = [45, 37],
                                                              zoom = 4,
                                                              serverLocation = null,
                                                          }) => {
    const [selectedLayer, setSelectedLayer] = useState<keyof typeof tileLayers>(
        (Cookies.get("selectedMapLayer") as keyof typeof tileLayers) || "Carto Dark"
    );
    const [pointStyle, setPointStyle] = useState<"by_traffic" | "single">(
        (Cookies.get("geoPointStyle") as "by_traffic" | "single") || "by_traffic"
    );
    const [pointColor, setPointColor] = useState<PointColorKey>(
        (Cookies.get("geoPointColor") as PointColorKey) || "blue"
    );
    const [points, setPoints] = useState<GeoPointAggDto[]>([]);
    const [hideZeroTraffic, setHideZeroTraffic] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        Cookies.set("selectedMapLayer", selectedLayer, { expires: 365 });
    }, [selectedLayer]);
    useEffect(() => {
        Cookies.set("geoPointStyle", pointStyle, { expires: 365 });
    }, [pointStyle]);
    useEffect(() => {
        Cookies.set("geoPointColor", pointColor, { expires: 365 });
    }, [pointColor]);

    const depsKey = useMemo(
        () =>
            JSON.stringify({
                from: toIso(from),
                to: toIso(to),
                vpnServerId,
                externalId,
                onlyWithCoordinates,
            }),
        [from, to, vpnServerId, externalId, onlyWithCoordinates]
    );

    useEffect(() => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const params: GetApiOpenVpnClientsOverviewPointsParams = {
            From: toIso(from),
            To: toIso(to),
            VpnServerId: vpnServerId ?? undefined,
            ExternalId: externalId ?? undefined,
            OnlyWithCoordinates: onlyWithCoordinates,
        };

        getApiOpenVpnClientsOverviewPoints(params, { signal: controller.signal })
            .then((resp) => {
                const next = pickPoints(resp);
                setPoints(next);
            })
            .catch((e: unknown) => {
                if (isAbortError(e) || abortRef.current?.signal.aborted) {
                    return;
                }

                const message =
                    typeof e === "object" && e && "message" in e
                        ? String((e as { message?: unknown }).message)
                        : String(e);

                toast.error(`Failed to load geo points: ${message}`, {
                    autoClose: 4500,
                    closeOnClick: true,
                });
            });

        return () => controller.abort();
    }, [depsKey]);

    const filteredPoints = useMemo(() => {
        return points.filter((p) => {
            if (p.latitude == null || p.longitude == null) return false;

            if (!hideZeroTraffic) return true;

            const total =
                (p.totalBytesIn ?? 0) +
                (p.totalBytesOut ?? 0);

            return total > 0;
        });
    }, [points, hideZeroTraffic]);

    const bounds = useMemo(() => {
        const latlngs: [number, number][] = [];
        if (serverLocation) latlngs.push(serverLocation);
        filteredPoints.forEach((p) => {
            if (p.latitude != null && p.longitude != null) {
                latlngs.push([p.latitude, p.longitude]);
            }
        });
        return latlngs.length ? L.latLngBounds(latlngs) : null;
    }, [filteredPoints, serverLocation]);

    return (
        <div style={{ height: "650px", width: "100%", marginTop: 20 }}>
            <div
                style={{
                    marginBottom: 10,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <strong>Map Style:</strong>
                    <select
                        className="btn secondary dropdown-select"
                        value={selectedLayer}
                        onChange={(e) =>
                            setSelectedLayer(e.target.value as keyof typeof tileLayers)
                        }
                    >
                        {Object.keys(tileLayers).map((key) => (
                            <option key={key} value={key}>
                                {key}
                            </option>
                        ))}
                    </select>
                    <strong>Point style:</strong>
                    <select
                        className="btn secondary dropdown-select"
                        value={pointStyle}
                        onChange={(e) => setPointStyle(e.target.value as "by_traffic" | "single")}
                    >
                        <option value="by_traffic">By traffic</option>
                        <option value="single">Single color</option>
                    </select>
                    {pointStyle === "single" && (
                        <select
                            className="btn secondary dropdown-select"
                            value={pointColor}
                            onChange={(e) => setPointColor(e.target.value as PointColorKey)}
                        >
                            {pointColorKeys.map((c) => (
                                <option key={c} value={c}>
                                    {c.charAt(0).toUpperCase() + c.slice(1)}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setHideZeroTraffic((v) => !v)}
                >
                    {hideZeroTraffic ? "Show 0-byte points" : "Hide 0-byte points"}
                </button>
            </div>

            <MapContainer style={{ height: 600, width: "100%" }} center={center} zoom={zoom}>
                <ChangeView center={center} zoom={zoom} />
                <TileLayer
                    url={tileLayers[selectedLayer].url}
                    attribution={tileLayers[selectedLayer].attribution}
                />

                {serverLocation && (
                    <Marker position={serverLocation} icon={serverIcon}>
                        <Popup>
                            <strong>VPN Server</strong>
                            <br />
                            🌎 {serverLocation[0]}, {serverLocation[1]}
                        </Popup>
                    </Marker>
                )}

                {filteredPoints.map((p, i) => {
                    const total = (p.totalBytesIn ?? 0) + (p.totalBytesOut ?? 0);
                    const colorKey = pointStyle === "single" ? pointColor : colorKeyForTraffic(total);
                    const icon = ICONS[colorKey];
                    return (
                        <Marker
                            key={`${p.latitude}-${p.longitude}-${i}`}
                            position={[p.latitude as number, p.longitude as number]}
                            icon={icon}
                        >
                            <Popup>
                                <div style={{ minWidth: 220 }}>
                                    <strong>{p.country ?? "Unknown country"}</strong>
                                    <br />
                                    {p.region ?? "Unknown region"}
                                    <br />
                                    📍 {p.latitude}, {p.longitude}
                                    <hr />
                                    👥 Sessions: {p.sessionsCount ?? 0}
                                    <br />
                                    📥 In: {formatBytes(p.totalBytesIn)}
                                    <br />
                                    📤 Out: {formatBytes(p.totalBytesOut)}
                                    <br />
                                    🎯 Total: {formatBytes(total)}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {bounds && <FitBounds bounds={bounds} />}
            </MapContainer>

            <div
                style={{
                    marginTop: 8,
                    fontSize: 12,
                    opacity: 0.85,
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                }}
            >
                <LegendItem colorUrl={ICONS.grey.options.iconUrl as string} label="0 B" />
                <LegendItem colorUrl={ICONS.blue.options.iconUrl as string} label="≤ 1 MB" />
                <LegendItem colorUrl={ICONS.green.options.iconUrl as string} label="≤ 50 MB" />
                <LegendItem colorUrl={ICONS.orange.options.iconUrl as string} label="≤ 1 GB" />
                <LegendItem colorUrl={ICONS.red.options.iconUrl as string} label="≤ 10 GB" />
                <LegendItem colorUrl={ICONS.violet.options.iconUrl as string} label="≤ 100 GB" />
                <LegendItem colorUrl={ICONS.yellow.options.iconUrl as string} label="≤ 500 GB" />
                <LegendItem colorUrl={ICONS.black.options.iconUrl as string} label="≤ 1 TB" />
                <LegendItem colorUrl={ICONS.black.options.iconUrl as string} label="> 1 TB" />
            </div>
        </div>
    );
};

const FitBounds: React.FC<{ bounds: L.LatLngBounds }> = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        map.fitBounds(bounds, { padding: [40, 40] });
    }, [map, bounds]);
    return null;
};

const LegendItem: React.FC<{ colorUrl: string; label: string }> = ({
                                                                       colorUrl,
                                                                       label,
                                                                   }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    <img src={colorUrl} width={14} height={22} alt="" />
        {label}
  </span>
);

export default GeoPointsMap;
