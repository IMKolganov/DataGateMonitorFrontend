import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import Cookies from "js-cookie";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { VpnClientInfoDto } from "../api/orvalModelShim";
import type { ProxyTrafficFlowUpdate } from "../hooks/useProxyTrafficFlow";
import "../css/VpnMap.css";

import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

const MARKER_BASE =
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x";
const MARKER_SHADOW =
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png";

const markerColors = ["red", "blue", "green", "orange", "yellow", "violet", "grey", "black"] as const;
type MarkerColor = (typeof markerColors)[number];
type MapViewMode = "map" | "globe";
type GlobeTrafficLayer = "arcs" | "submarine";
const BASE_MAX_RENDERED_FLOWS = 300;
const BASE_MAX_RENDERED_POINTS = 1200;
type PerformanceMode = "auto" | "high" | "balanced" | "low";

const createMarkerIcon = (color: MarkerColor, withShadow = true): L.Icon =>
  L.icon({
    iconUrl: `${MARKER_BASE}-${color}.png`,
    ...(withShadow && {
      shadowUrl: MARKER_SHADOW,
      shadowSize: [41, 41],
    }),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

const serverIcon = createMarkerIcon("blue");

const ChangeView = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

interface VpnMapProps {
  clients: VpnClientInfoDto[];
  serverLocation?: [number, number] | null;
  serverName?: string | null;
  trafficFlows?: ProxyTrafficFlowUpdate[];
  serverMarkers?: { id: number; name: string; position: [number, number] }[];
}

type FlowDirection = "clientToServer" | "serverToClient";

function normalizeIpForMatch(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = raw.trim().toLowerCase();
  if (!s) return "";

  // Some gateways/proxies may provide comma-separated forwarded values.
  if (s.includes(",")) s = s.split(",")[0]?.trim() ?? s;

  // [ipv6]:port -> ipv6
  const bracketMatch = s.match(/^\[([^[\]]+)\](?::\d+)?$/);
  if (bracketMatch?.[1]) s = bracketMatch[1];

  // IPv4:port -> IPv4
  const ipv4WithPort = s.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort?.[1]) s = ipv4WithPort[1];

  // ::ffff:IPv4 -> IPv4
  if (s.startsWith("::ffff:")) s = s.slice("::ffff:".length);

  return s.trim();
}

function byServerKey(serverId: number | null | undefined, key: string): string {
  if (!key) return "";
  if (typeof serverId === "number" && Number.isFinite(serverId)) {
    return `${serverId}:${key}`;
  }
  return key;
}

function intensityFromDelta(delta: number, maxDelta: number): number {
  if (delta <= 0) return 0;
  if (maxDelta <= 0) return 1;
  return Math.max(0, Math.min(1, Math.log10(delta + 1) / Math.log10(maxDelta + 1)));
}

function offsetPolylinePositions(
  from: [number, number],
  to: [number, number],
  sign: 1 | -1
): [[number, number], [number, number]] {
  const dx = to[1] - from[1];
  const dy = to[0] - from[0];
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return [from, to];

  const nx = -dy / len;
  const ny = dx / len;
  const offset = Math.max(0.01, Math.min(0.05, len * 0.08));
  const ox = nx * offset * sign;
  const oy = ny * offset * sign;

  return [
    [from[0] + oy, from[1] + ox],
    [to[0] + oy, to[1] + ox],
  ];
}

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
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
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
    attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
  },
};

const pointStyleLabels: Record<MarkerColor, string> = {
  red: "Red",
  blue: "Blue",
  green: "Green",
  orange: "Orange",
  yellow: "Yellow",
  violet: "Violet",
  grey: "Grey",
  black: "Black",
};

const viewModeLabels: Record<MapViewMode, string> = {
  map: "Map",
  globe: "Globe",
};
const globeTrafficLayerLabels: Record<GlobeTrafficLayer, string> = {
  arcs: "Arcs",
  submarine: "Submarine",
};

const Globe = React.lazy(() => import("react-globe.gl"));

interface RenderBudget {
  maxFlows: number;
  maxPoints: number;
}

const performanceModeLabels: Record<PerformanceMode, string> = {
  auto: "Auto",
  high: "High",
  balanced: "Balanced",
  low: "Low",
};

function resolveRenderBudget(width: number, height: number, mode: PerformanceMode): RenderBudget {
  const modeMultiplier =
    mode === "high" ? 1.35 :
    mode === "balanced" ? 0.9 :
    mode === "low" ? 0.55 :
    null;

  let score = 1;
  if (modeMultiplier !== null) {
    score *= modeMultiplier;
  } else {
    const nav = navigator as Navigator & { deviceMemory?: number };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) score *= 0.55;
    if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) score *= 0.75;
    if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4) score *= 0.8;

    const area = width * height;
    if (area < 700_000) score *= 0.65;
    else if (area < 1_100_000) score *= 0.8;
  }

  return {
    maxFlows: Math.max(60, Math.round(BASE_MAX_RENDERED_FLOWS * score)),
    maxPoints: Math.max(200, Math.round(BASE_MAX_RENDERED_POINTS * score)),
  };
}

const VpnMap: React.FC<VpnMapProps> = ({
  clients,
  serverLocation,
  serverName,
  trafficFlows = [],
  serverMarkers = [],
}) => {
  const defaultCenter: [number, number] = [45, 37];
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [globeWidth, setGlobeWidth] = useState(900);
  const [globeHeight, setGlobeHeight] = useState(580);

  const [selectedLayer, setSelectedLayer] = useState<keyof typeof tileLayers>(
      (Cookies.get("selectedMapLayer") as keyof typeof tileLayers) || "Carto Dark"
  );
  const [pointColor, setPointColor] = useState<MarkerColor>(
      (Cookies.get("selectedPointColor") as MarkerColor) || "red"
  );
  const [viewMode, setViewMode] = useState<MapViewMode>(
      (Cookies.get("selectedMapViewMode") as MapViewMode) || "map"
  );
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>(
      (Cookies.get("selectedMapPerformanceMode") as PerformanceMode) || "auto"
  );
  const [globeTrafficLayer, setGlobeTrafficLayer] = useState<GlobeTrafficLayer>(
      (Cookies.get("selectedGlobeTrafficLayer") as GlobeTrafficLayer) || "arcs"
  );
  const [viewportSize, setViewportSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const renderBudget = useMemo(
    () => resolveRenderBudget(viewportSize.width, viewportSize.height, performanceMode),
    [viewportSize.width, viewportSize.height, performanceMode]
  );

  useEffect(() => {
    Cookies.set("selectedMapLayer", selectedLayer, { expires: 365 });
  }, [selectedLayer]);
  useEffect(() => {
    Cookies.set("selectedPointColor", pointColor, { expires: 365 });
  }, [pointColor]);
  useEffect(() => {
    Cookies.set("selectedMapViewMode", viewMode, { expires: 365 });
  }, [viewMode]);
  useEffect(() => {
    Cookies.set("selectedMapPerformanceMode", performanceMode, { expires: 365 });
  }, [performanceMode]);
  useEffect(() => {
    Cookies.set("selectedGlobeTrafficLayer", globeTrafficLayer, { expires: 365 });
  }, [globeTrafficLayer]);

  useEffect(() => {
    if (viewMode !== "globe") return;
    if (typeof ResizeObserver === "undefined") return;
    if (!rootRef.current) return;

    const observe = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.max(400, Math.round(entry.contentRect.width));
      const height = Math.max(420, Math.round(entry.contentRect.height - 44));
      setGlobeWidth(width);
      setGlobeHeight(height);
      setViewportSize({ width, height });
    });
    observe.observe(rootRef.current);
    return () => observe.disconnect();
  }, [viewMode]);

  useEffect(() => {
    const onResize = () => setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const clientIcon = useMemo(() => createMarkerIcon(pointColor), [pointColor]);

  const visibleClients = useMemo(
      () =>
          clients.filter(
              (c) => typeof c.latitude === "number" && typeof c.longitude === "number"
          ),
      [clients]
  );

  const clientGeoByIp = useMemo(() => {
    const index = new Map<string, [number, number]>();
    for (const c of visibleClients) {
      if (typeof c.latitude !== "number" || typeof c.longitude !== "number") continue;
      const point: [number, number] = [c.latitude, c.longitude];
      const candidates = [c.proxyRealIp ?? null, c.remoteIp ?? null];
      for (const candidate of candidates) {
        if (!candidate) continue;
        const raw = candidate.trim();
        if (raw && !index.has(raw)) index.set(raw, point);
        const byServerRaw = byServerKey(c.vpnServerId, raw);
        if (byServerRaw && !index.has(byServerRaw)) index.set(byServerRaw, point);
        const normalized = normalizeIpForMatch(raw);
        if (normalized && !index.has(normalized)) index.set(normalized, point);
        const byServerNormalized = byServerKey(c.vpnServerId, normalized);
        if (byServerNormalized && !index.has(byServerNormalized)) index.set(byServerNormalized, point);
      }
    }
    return index;
  }, [visibleClients]);

  const clientGeoByIdentity = useMemo(() => {
    const index = new Map<string, [number, number]>();
    for (const c of visibleClients) {
      if (typeof c.latitude !== "number" || typeof c.longitude !== "number") continue;
      const point: [number, number] = [c.latitude, c.longitude];
      const candidates = [c.username, c.commonName, c.displayName]
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim().toLowerCase());
      for (const key of candidates) {
        if (!index.has(key)) index.set(key, point);
        const byServerIdentity = byServerKey(c.vpnServerId, key);
        if (byServerIdentity && !index.has(byServerIdentity)) index.set(byServerIdentity, point);
      }
    }
    return index;
  }, [visibleClients]);

  const serverLocationById = useMemo(() => {
    const index = new Map<number, [number, number]>();
    for (const marker of serverMarkers) {
      index.set(marker.id, marker.position);
    }
    return index;
  }, [serverMarkers]);

  const visibleTrafficFlows = useMemo(() => {
    return trafficFlows
      .map((f) => {
        const to =
          typeof f.serverId === "number"
            ? serverLocationById.get(f.serverId)
            : serverLocation;
        if (!to) return null;

        const ip = (f.realClientIp ?? "").trim();
        const normalizedIp = normalizeIpForMatch(ip);
        const usernameKey = (f.username ?? f.clientRef ?? "").trim().toLowerCase();
        const serverScopedIp = byServerKey(f.serverId, ip);
        const serverScopedNormalizedIp = byServerKey(f.serverId, normalizedIp);
        const serverScopedIdentity = byServerKey(f.serverId, usernameKey);
        const from =
          (serverScopedIp ? clientGeoByIp.get(serverScopedIp) : undefined) ??
          (serverScopedNormalizedIp ? clientGeoByIp.get(serverScopedNormalizedIp) : undefined) ??
          (serverScopedIdentity ? clientGeoByIdentity.get(serverScopedIdentity) : undefined) ??
          clientGeoByIp.get(ip) ??
          (normalizedIp ? clientGeoByIp.get(normalizedIp) : undefined) ??
          (usernameKey ? clientGeoByIdentity.get(usernameKey) : undefined);
        if (!from) return null;

        const inDelta = Math.max(0, f.clientToServerBytesDelta ?? 0);
        const outDelta = Math.max(0, f.serverToClientBytesDelta ?? 0);
        const activity = inDelta + outDelta;

        return { ...f, from, to, activity };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => {
        if (a.isIdle !== b.isIdle) return a.isIdle ? 1 : -1;
        if (a.activity !== b.activity) return b.activity - a.activity;
        return a.connectionId.localeCompare(b.connectionId);
      })
      .slice(0, renderBudget.maxFlows);
  }, [trafficFlows, clientGeoByIp, clientGeoByIdentity, serverLocation, serverLocationById, renderBudget.maxFlows]);

  const visibleTrafficSegments = useMemo(() => {
    const maxDelta = visibleTrafficFlows.reduce((acc, flow) => {
      return Math.max(acc, flow.clientToServerBytesDelta ?? 0, flow.serverToClientBytesDelta ?? 0);
    }, 0);

    return visibleTrafficFlows.flatMap((flow) => {
      if (flow.state === "failed" || flow.state === "disconnected") return [];

      const directions: Array<{ key: FlowDirection; delta: number }> = [
        { key: "clientToServer", delta: Math.max(0, flow.clientToServerBytesDelta ?? 0) },
        { key: "serverToClient", delta: Math.max(0, flow.serverToClientBytesDelta ?? 0) },
      ];

      return directions
        .filter((d) => {
          if (d.delta > 0) return true;
          if (d.key === "clientToServer") return Math.max(0, flow.clientToServerBytesTotal ?? 0) > 0;
          return Math.max(0, flow.serverToClientBytesTotal ?? 0) > 0;
        })
        .map((d) => {
          const visualDelta = d.delta > 0 ? d.delta : 1;
          const intensity = intensityFromDelta(visualDelta, maxDelta);
          const weight = 1.2 + intensity * 6.8;
          const opacityBase = 0.25 + intensity * 0.75;
          const opacity = flow.isIdle ? opacityBase * 0.45 : opacityBase;
          const color = d.key === "clientToServer" ? "#ff9800" : "#00e5ff";
          const mapPath = offsetPolylinePositions(
            flow.from,
            flow.to,
            d.key === "clientToServer" ? 1 : -1
          );

          return {
            id: `${flow.connectionId}:${d.key}`,
            connectionId: flow.connectionId,
            direction: d.key,
            delta: d.delta,
            color,
            weight,
            opacity,
            intensity,
            isIdle: flow.isIdle,
            state: flow.state,
            from: flow.from,
            to: flow.to,
            mapPath,
            label:
              d.key === "clientToServer"
                ? `C→S Δ: ${d.delta} B/s`
                : `S→C Δ: ${d.delta} B/s`,
          };
        });
    });
  }, [visibleTrafficFlows]);

  const globePointsData = useMemo(() => {
    const points: Array<{
      id: string;
      lat: number;
      lng: number;
      color: string;
      label: string;
      altitude: number;
      radius: number;
    }> = [];

    if (serverMarkers.length > 0) {
      for (const marker of serverMarkers.slice(0, renderBudget.maxPoints)) {
        points.push({
          id: `server-${marker.id}`,
          lat: marker.position[0],
          lng: marker.position[1],
          color: "#4fc3f7",
          label: `<strong>${marker.name}</strong>`,
          altitude: 0.06,
          radius: 0.28,
        });
      }
    } else if (serverLocation) {
      points.push({
        id: "server",
        lat: serverLocation[0],
        lng: serverLocation[1],
        color: "#4fc3f7",
        label: `<strong>${serverName ?? "VPN Server"}</strong>`,
        altitude: 0.06,
        radius: 0.28,
      });
    }

    for (const client of visibleClients.slice(0, renderBudget.maxPoints - points.length)) {
      points.push({
        id: `client-${client.id}`,
        lat: client.latitude as number,
        lng: client.longitude as number,
        color: "#ff7043",
        label: `<strong>${client.commonName ?? "Client"}</strong><br/>${client.remoteIp ?? "Unknown IP"}`,
        altitude: 0.02,
        radius: 0.2,
      });
    }

    return points;
  }, [visibleClients, serverLocation, serverName, serverMarkers, renderBudget.maxPoints]);

  const globeArcsData = useMemo(() => {
    return visibleTrafficSegments.map((segment) => {
      const [startLat, startLng] =
        segment.direction === "clientToServer" ? segment.from : segment.to;
      const [endLat, endLng] =
        segment.direction === "clientToServer" ? segment.to : segment.from;
      return {
        id: segment.id,
        startLat,
        startLng,
        endLat,
        endLng,
        color: segment.color,
        label: `<strong>${segment.connectionId}</strong><br/>${segment.label}<br/>State: ${segment.state}${segment.isIdle ? " (idle)" : " (active)"}`,
        isIdle: segment.isIdle,
        intensity: segment.intensity,
      };
    });
  }, [visibleTrafficSegments]);

  const globeCablePathsData = useMemo(() => {
    return visibleTrafficSegments.map((segment) => {
      const start =
        segment.direction === "clientToServer"
          ? { lat: segment.from[0], lng: segment.from[1] }
          : { lat: segment.to[0], lng: segment.to[1] };
      const end =
        segment.direction === "clientToServer"
          ? { lat: segment.to[0], lng: segment.to[1] }
          : { lat: segment.from[0], lng: segment.from[1] };

      const midLat = (start.lat + end.lat) / 2;
      const midLng = (start.lng + end.lng) / 2;
      const bendSign = segment.direction === "clientToServer" ? 1 : -1;
      const bendFactor = 4 + segment.intensity * 6;
      const alt = 0.008 + segment.intensity * 0.03;

      return {
        id: segment.id,
        color: segment.color,
        width: 0.2 + segment.intensity * 1.35,
        isIdle: segment.isIdle,
        intensity: segment.intensity,
        label: `<strong>${segment.connectionId}</strong><br/>${segment.label}<br/>State: ${
          segment.state
        }${segment.isIdle ? " (idle)" : " (active)"}`,
        points: [
          { ...start, alt: 0.001 },
          { lat: midLat + bendSign * bendFactor, lng: midLng - bendSign * (bendFactor * 0.6), alt },
          { lat: midLat + bendSign * (bendFactor * 0.35), lng: midLng + bendSign * (bendFactor * 0.5), alt: alt * 0.9 },
          { ...end, alt: 0.001 },
        ],
      };
    });
  }, [visibleTrafficSegments]);

  const renderedStats = useMemo(() => {
    return {
      renderedFlows: visibleTrafficFlows.length,
      totalFlows: trafficFlows.length,
      flowLimit: renderBudget.maxFlows,
      renderedSegments: visibleTrafficSegments.length,
      renderedPoints: globePointsData.length,
      totalPoints:
        visibleClients.length + (serverMarkers.length > 0 ? serverMarkers.length : (serverLocation ? 1 : 0)),
      totalServers: serverMarkers.length > 0 ? serverMarkers.length : (serverLocation ? 1 : 0),
      pointLimit: renderBudget.maxPoints,
    };
  }, [
    visibleTrafficFlows.length,
    trafficFlows.length,
    renderBudget.maxFlows,
    visibleTrafficSegments.length,
    globePointsData.length,
    visibleClients.length,
    serverLocation,
    serverMarkers.length,
    renderBudget.maxPoints,
  ]);

  return (
      <div className="vpn-map-root" ref={rootRef}>
        <div className="vpn-map-toolbar">
          <strong>View:</strong>
          <select
              className="btn secondary dropdown-select"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as MapViewMode)}
          >
            {Object.keys(viewModeLabels).map((key) => (
                <option key={key} value={key}>
                  {viewModeLabels[key as MapViewMode]}
                </option>
            ))}
          </select>
          {viewMode === "map" ? (
              <>
                <strong>Map Style:</strong>
                <select
                    className="btn secondary dropdown-select"
                    value={selectedLayer}
                    onChange={(e) => setSelectedLayer(e.target.value as keyof typeof tileLayers)}
                >
                  {Object.keys(tileLayers).map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                  ))}
                </select>
              </>
          ) : null}
          <strong>Point color:</strong>
          <select
              className="btn secondary dropdown-select"
              value={pointColor}
              onChange={(e) => setPointColor(e.target.value as MarkerColor)}
          >
            {markerColors.map((c) => (
                <option key={c} value={c}>
                  {pointStyleLabels[c]}
                </option>
            ))}
          </select>
          <strong>Performance:</strong>
          <select
              className="btn secondary dropdown-select"
              value={performanceMode}
              onChange={(e) => setPerformanceMode(e.target.value as PerformanceMode)}
          >
            {Object.keys(performanceModeLabels).map((key) => (
                <option key={key} value={key}>
                  {performanceModeLabels[key as PerformanceMode]}
                </option>
            ))}
          </select>
          {viewMode === "globe" ? (
            <>
              <strong>Traffic layer:</strong>
              <select
                  className="btn secondary dropdown-select"
                  value={globeTrafficLayer}
                  onChange={(e) => setGlobeTrafficLayer(e.target.value as GlobeTrafficLayer)}
              >
                {Object.keys(globeTrafficLayerLabels).map((key) => (
                    <option key={key} value={key}>
                      {globeTrafficLayerLabels[key as GlobeTrafficLayer]}
                    </option>
                ))}
              </select>
            </>
          ) : null}
          <span className="vpn-map-stats">
            Flows: {renderedStats.renderedFlows}/{renderedStats.totalFlows} (limit {renderedStats.flowLimit}) | Segments:{" "}
            {renderedStats.renderedSegments} | Servers: {renderedStats.totalServers} | Points:{" "}
            {renderedStats.renderedPoints}/{renderedStats.totalPoints} (limit {renderedStats.pointLimit})
          </span>
          <span className="vpn-map-stats">C→S: orange | S→C: cyan | thicker/brighter = more traffic</span>
        </div>

        {viewMode === "map" ? (
            <MapContainer className="map-container-full-size" center={defaultCenter} zoom={4}>
              <ChangeView center={defaultCenter} zoom={4} />
              <TileLayer
                  url={tileLayers[selectedLayer].url}
                  attribution={tileLayers[selectedLayer].attribution}
              />

              {serverMarkers.length > 0
                ? serverMarkers.map((marker) => (
                    <Marker key={`server-${marker.id}`} position={marker.position} icon={serverIcon}>
                      <Popup>
                        <strong>{marker.name}</strong>
                        <br />
                        🌎 Location: {marker.position[0]}, {marker.position[1]}
                      </Popup>
                    </Marker>
                  ))
                : serverLocation && (
                    <Marker position={serverLocation} icon={serverIcon}>
                      <Popup>
                        <strong>{serverName ?? "VPN Server"}</strong>
                        <br />
                        🌎 Location: {serverLocation[0]}, {serverLocation[1]}
                      </Popup>
                    </Marker>
                  )}

              {visibleClients.map((client) => (
                  <Marker
                      key={`${client.vpnServerId ?? "na"}:${client.id ?? client.remoteIp ?? client.commonName ?? "client"}`}
                      position={[client.latitude as number, client.longitude as number]}
                      icon={clientIcon}
                  >
                    <Popup>
                      <strong>{client.commonName}</strong>
                      <br />
                      {client.city}, {client.country}
                      <br />
                      {client.remoteIp}
                      <br />
                      📥 {client.bytesReceived} Bytes | 📤 {client.bytesSent} Bytes
                    </Popup>
                  </Marker>
              ))}

              {visibleTrafficSegments.map((segment) => (
                  <Polyline
                      key={segment.id}
                      positions={segment.mapPath}
                      pathOptions={{ color: segment.color, weight: segment.weight, opacity: segment.opacity }}
                  >
                    <Popup>
                      <strong>{segment.connectionId}</strong>
                      <br />
                      State: {segment.state} {segment.isIdle ? "(idle)" : "(active)"}
                      <br />
                      {segment.label}
                    </Popup>
                  </Polyline>
              ))}
            </MapContainer>
        ) : (
            <div className="vpn-globe-root">
              <Suspense fallback={<div className="vpn-globe-loading">Loading globe...</div>}>
                <Globe
                    width={globeWidth}
                    height={globeHeight}
                    backgroundColor="rgba(0,0,0,0)"
                    globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
                    bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
                    showAtmosphere={false}
                    pointsData={globePointsData}
                    pointLat="lat"
                    pointLng="lng"
                    pointColor="color"
                    pointAltitude="altitude"
                    pointRadius="radius"
                    pointLabel="label"
                    pointsMerge
                    pointsTransitionDuration={0}
                    arcsData={globeTrafficLayer === "arcs" ? globeArcsData : []}
                    arcStartLat="startLat"
                    arcStartLng="startLng"
                    arcEndLat="endLat"
                    arcEndLng="endLng"
                    arcColor={(d: unknown) => [(d as { color: string }).color, (d as { color: string }).color]}
                    arcLabel="label"
                    arcCurveResolution={24}
                    arcDashLength={(d: unknown) => 0.16 + ((d as { intensity?: number }).intensity ?? 0) * 0.22}
                    arcDashGap={0.7}
                    arcDashAnimateTime={(d: unknown) => {
                      const arc = d as { isIdle: boolean; intensity?: number };
                      if (arc.isIdle) return 0;
                      const intensity = arc.intensity ?? 0;
                      return Math.max(450, 1400 - Math.round(intensity * 850));
                    }}
                    arcsTransitionDuration={0}
                    pathsData={globeTrafficLayer === "submarine" ? globeCablePathsData : []}
                    pathPoints="points"
                    pathPointLat="lat"
                    pathPointLng="lng"
                    pathPointAlt="alt"
                    pathColor="color"
                    pathStroke={(d: unknown) => (d as { width: number }).width}
                    pathLabel="label"
                    pathDashLength={(d: unknown) => {
                      const cable = d as { intensity?: number };
                      return 0.08 + (cable.intensity ?? 0) * 0.12;
                    }}
                    pathDashGap={0.2}
                    pathDashAnimateTime={(d: unknown) => {
                      const cable = d as { isIdle: boolean; intensity?: number };
                      if (cable.isIdle) return 0;
                      const intensity = cable.intensity ?? 0;
                      return Math.max(350, 1200 - Math.round(intensity * 700));
                    }}
                    pathTransitionDuration={0}
                />
              </Suspense>
            </div>
        )}
      </div>
  );
};

export default VpnMap;
