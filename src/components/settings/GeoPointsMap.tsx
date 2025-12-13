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

// Static server icon
const serverIcon = L.icon({
    iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

const ICONS: Record<string, L.Icon> = {
    grey: L.icon({
        iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    }),
    blue: L.icon({
        iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    }),
    green: L.icon({
        iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    }),
    orange: L.icon({
        iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    }),
    red: L.icon({
        iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    }),
    violet: L.icon({
        iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    }),
    yellow: L.icon({
        iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    }),
    black: L.icon({
        iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    }),
};

// Thresholds (bytes) -> icon color
const ONE_MB = 1024 * 1024;
const FIFTY_MB = 50 * ONE_MB;
const ONE_GB = 1024 * ONE_MB;
const TEN_GB = 10 * ONE_GB;
const HUNDRED_GB = 100 * ONE_GB;
const FIVE_HUNDRED_GB = 500 * ONE_GB;
const ONE_TB = 1024 * ONE_GB;

const tileLayers = {
    "Carto Dark": {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://carto.com/">Carto</a>',
    },
    OpenStreetMap: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    "Esri Dark Gray": {
        url:
            "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
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

function iconForTraffic(totalBytes: number): L.Icon {
    if (!totalBytes || totalBytes <= 0) return ICONS.grey;
    if (totalBytes <= ONE_MB) return ICONS.blue;
    if (totalBytes <= FIFTY_MB) return ICONS.green;
    if (totalBytes <= ONE_GB) return ICONS.orange;
    if (totalBytes <= TEN_GB) return ICONS.red;
    if (totalBytes <= HUNDRED_GB) return ICONS.violet;
    if (totalBytes <= FIVE_HUNDRED_GB) return ICONS.yellow;
    if (totalBytes <= ONE_TB) return ICONS.black;
    return ICONS.black;
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
    const [points, setPoints] = useState<GeoPointAggDto[]>([]);
    const [hideZeroTraffic, setHideZeroTraffic] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        Cookies.set("selectedMapLayer", selectedLayer, { expires: 365 });
    }, [selectedLayer]);

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

        getApiOpenVpnClientsOverviewPoints(params, controller.signal)
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
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
                    const icon = iconForTraffic(total);
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
