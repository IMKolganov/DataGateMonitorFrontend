import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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
const DEFAULT_MAP_CENTER: [number, number] = [45, 37];
const BASE_MAX_RENDERED_FLOWS = 300;
const BASE_MAX_RENDERED_POINTS = 1200;
/** Max simultaneous dash animations (each hub tick adds pulses; old ones expire after animate time). */
const MAX_TRAFFIC_PULSES = 96;
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

interface VpnMapProps {
  clients: VpnClientInfoDto[];
  serverLocation?: [number, number] | null;
  serverName?: string | null;
  trafficFlows?: ProxyTrafficFlowUpdate[];
  serverMarkers?: { id: number; name: string; position: [number, number] }[];
  animationMode?: "live" | "offline";
}

type FlowDirection = "clientToServer" | "serverToClient";
type TrafficSegment = {
  id: string;
  connectionId: string;
  direction: FlowDirection;
  delta: number;
  color: string;
  weight: number;
  opacity: number;
  intensity: number;
  isIdle: boolean;
  state: ProxyTrafficFlowUpdate["state"];
  from: [number, number];
  to: [number, number];
  mapPath: [[number, number], [number, number]];
  label: string;
};

type GlobeArcDatum = {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  /** Stable tuple for three-globe (do not use inline arcColor fn — it restarts dash anim). */
  dashColors: [string, string];
  dashAnimateMs: number;
  label: string;
  isIdle: boolean;
  intensity: number;
};

type GlobeCableDatum = {
  id: string;
  color: string;
  width: number;
  dashAnimateMs: number;
  isIdle: boolean;
  intensity: number;
  label: string;
  points: Array<{ lat: number; lng: number; alt: number }>;
};

type TimedGlobeArc = GlobeArcDatum & { expiresAt: number };
type TimedGlobeCable = GlobeCableDatum & { expiresAt: number };

function buildGlobeArcFromSegment(
  segment: TrafficSegment,
  arcId: string,
  isIdle: boolean,
  dashAnimateMs: number,
): GlobeArcDatum {
  const [startLat, startLng] =
    segment.direction === "clientToServer" ? segment.from : segment.to;
  const [endLat, endLng] =
    segment.direction === "clientToServer" ? segment.to : segment.from;
  const label = `<strong>${segment.connectionId}</strong><br/>${segment.label}<br/>State: ${segment.state}${
    isIdle ? " (idle)" : " (active)"
  }`;
  return {
    id: arcId,
    startLat,
    startLng,
    endLat,
    endLng,
    color: segment.color,
    dashColors: [segment.color, segment.color],
    dashAnimateMs: isIdle ? 0 : dashAnimateMs,
    label,
    isIdle,
    intensity: segment.intensity,
  };
}

function buildGlobeCableFromSegment(
  segment: TrafficSegment,
  pathId: string,
  isIdle: boolean,
  dashAnimateMs: number,
): GlobeCableDatum {
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
  const width = 0.2 + segment.intensity * 1.35;
  const label = `<strong>${segment.connectionId}</strong><br/>${segment.label}<br/>State: ${segment.state}${
    isIdle ? " (idle)" : " (active)"
  }`;
  const points = [
    { ...start, alt: 0.001 },
    { lat: midLat + bendSign * bendFactor, lng: midLng - bendSign * (bendFactor * 0.6), alt },
    {
      lat: midLat + bendSign * (bendFactor * 0.35),
      lng: midLng + bendSign * (bendFactor * 0.5),
      alt: alt * 0.9,
    },
    { ...end, alt: 0.001 },
  ];

  return {
    id: pathId,
    color: segment.color,
    width,
    dashAnimateMs: isIdle ? 0 : dashAnimateMs,
    isIdle,
    intensity: segment.intensity,
    label,
    points,
  };
}

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

function collectClientIpCandidates(client: VpnClientInfoDto): string[] {
  const typedCandidates = [client.proxyRealIp, client.remoteIp, client.localIp];
  const dynamic = client as unknown as Record<string, unknown>;
  const dynamicKeys = ["realClientIp", "ip", "clientIp", "address", "realIp", "remoteAddress"];
  for (const k of dynamicKeys) {
    const raw = dynamic[k];
    if (typeof raw === "string") typedCandidates.push(raw);
  }

  // Defensive fallback: pick any string field that looks like IP-ish data.
  // This keeps matching alive even if backend DTO field names differ.
  const ipLike = /(\d{1,3}(?:\.\d{1,3}){3})|(::[a-f0-9:]+)|([a-f0-9:]+:[a-f0-9:]+)/i;
  for (const value of Object.values(dynamic)) {
    if (typeof value !== "string") continue;
    const s = value.trim();
    if (!s) continue;
    if (ipLike.test(s)) typedCandidates.push(s);
  }

  return typedCandidates
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function collectClientIdentityCandidates(client: VpnClientInfoDto): string[] {
  const typedCandidates = [client.username, client.commonName, client.displayName, client.externalId];
  const dynamic = client as unknown as Record<string, unknown>;
  const dynamicKeys = ["email", "clientRef", "userName", "user"];
  for (const k of dynamicKeys) {
    const raw = dynamic[k];
    if (typeof raw === "string") typedCandidates.push(raw);
  }

  return typedCandidates
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x.length > 0);
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
  animationMode = "live",
}) => {
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
  const trafficDebugEnabled = useMemo(() => {
    try {
      return localStorage.getItem("trafficFlowDebug") === "1";
    } catch {
      return false;
    }
  }, []);

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
      // Keep globe size stable: derive height from width to avoid resize feedback loops.
      const height = Math.max(420, Math.min(820, Math.round(width * 0.62)));
      setGlobeWidth((prev) => (prev === width ? prev : width));
      setGlobeHeight((prev) => (prev === height ? prev : height));
      setViewportSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
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
      const candidates = collectClientIpCandidates(c);
      for (const candidate of candidates) {
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
      const candidates = collectClientIdentityCandidates(c);
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
            ? (serverLocationById.get(f.serverId) ?? serverLocation)
            : serverLocation;
        if (!to) return null;

        const ip = (f.realClientIp ?? "").trim();
        const normalizedIp = normalizeIpForMatch(ip);
        const identityKeys = [f.username, f.clientRef, f.email]
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .map((x) => x.trim().toLowerCase());
        const primaryIdentity = identityKeys[0] ?? "";
        const serverScopedIp = byServerKey(f.serverId, ip);
        const serverScopedNormalizedIp = byServerKey(f.serverId, normalizedIp);
        const scopedIdentityCandidates = identityKeys.map((key) => byServerKey(f.serverId, key));
        const scopedIdentityMatch = scopedIdentityCandidates
          .map((key) => (key ? clientGeoByIdentity.get(key) : undefined))
          .find((x) => x != null);
        const identityMatch = identityKeys
          .map((key) => clientGeoByIdentity.get(key))
          .find((x) => x != null);
        const from =
          (serverScopedIp ? clientGeoByIp.get(serverScopedIp) : undefined) ??
          (serverScopedNormalizedIp ? clientGeoByIp.get(serverScopedNormalizedIp) : undefined) ??
          scopedIdentityMatch ??
          clientGeoByIp.get(ip) ??
          (normalizedIp ? clientGeoByIp.get(normalizedIp) : undefined) ??
          identityMatch ??
          (primaryIdentity ? clientGeoByIdentity.get(primaryIdentity) : undefined);
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

  const unmatchedTrafficDebug = useMemo(() => {
    if (!trafficDebugEnabled || trafficFlows.length === 0) return [];

    const result: Array<{ connectionId: string; serverId?: number; realClientIp?: string | null; reason: string }> = [];
    for (const f of trafficFlows) {
      const to =
        typeof f.serverId === "number"
          ? (serverLocationById.get(f.serverId) ?? serverLocation)
          : serverLocation;
      if (!to) {
        result.push({
          connectionId: f.connectionId,
          serverId: f.serverId,
          realClientIp: f.realClientIp,
          reason: "no server location",
        });
        continue;
      }

      const ip = (f.realClientIp ?? "").trim();
      const normalizedIp = normalizeIpForMatch(ip);
      const identityKeys = [f.username, f.clientRef, f.email]
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim().toLowerCase());
      const primaryIdentity = identityKeys[0] ?? "";
      const serverScopedIp = byServerKey(f.serverId, ip);
      const serverScopedNormalizedIp = byServerKey(f.serverId, normalizedIp);
      const scopedIdentityCandidates = identityKeys.map((key) => byServerKey(f.serverId, key));
      const scopedIdentityMatch = scopedIdentityCandidates
        .map((key) => (key ? clientGeoByIdentity.get(key) : undefined))
        .find((x) => x != null);
      const identityMatch = identityKeys
        .map((key) => clientGeoByIdentity.get(key))
        .find((x) => x != null);
      const from =
        (serverScopedIp ? clientGeoByIp.get(serverScopedIp) : undefined) ??
        (serverScopedNormalizedIp ? clientGeoByIp.get(serverScopedNormalizedIp) : undefined) ??
        scopedIdentityMatch ??
        clientGeoByIp.get(ip) ??
        (normalizedIp ? clientGeoByIp.get(normalizedIp) : undefined) ??
        identityMatch ??
        (primaryIdentity ? clientGeoByIdentity.get(primaryIdentity) : undefined);
      if (!from) {
        result.push({
          connectionId: f.connectionId,
          serverId: f.serverId,
          realClientIp: f.realClientIp,
          reason: "no client geo match",
        });
      }
    }
    return result;
  }, [trafficDebugEnabled, trafficFlows, serverLocationById, serverLocation, clientGeoByIdentity, clientGeoByIp]);

  const clientDebugSample = useMemo(() => {
    if (!trafficDebugEnabled || visibleClients.length === 0) return [];
    return visibleClients.slice(0, 15).map((client) => ({
      id: client.id ?? null,
      vpnServerId: client.vpnServerId ?? null,
      commonName: client.commonName ?? null,
      username: client.username ?? null,
      ipCandidates: collectClientIpCandidates(client).slice(0, 6),
      identityCandidates: collectClientIdentityCandidates(client).slice(0, 6),
      geo: [client.latitude, client.longitude],
    }));
  }, [trafficDebugEnabled, visibleClients]);

  const flowDebugSample = useMemo(() => {
    if (!trafficDebugEnabled || trafficFlows.length === 0) return [];
    return trafficFlows.slice(0, 15).map((flow) => ({
      connectionId: flow.connectionId,
      serverId: flow.serverId ?? null,
      state: flow.state,
      isConnected: flow.isConnected,
      isIdle: flow.isIdle,
      realClientIp: flow.realClientIp ?? null,
      username: flow.username ?? null,
      clientRef: flow.clientRef ?? null,
      email: flow.email ?? null,
      c2sDelta: flow.clientToServerBytesDelta,
      s2cDelta: flow.serverToClientBytesDelta,
      c2sTotal: flow.clientToServerBytesTotal,
      s2cTotal: flow.serverToClientBytesTotal,
      emittedAtUtc: flow.emittedAtUtc,
    }));
  }, [trafficDebugEnabled, trafficFlows]);

  const clientIpDebugList = useMemo(() => {
    if (!trafficDebugEnabled || visibleClients.length === 0) return [];
    return visibleClients.slice(0, 30).map((client) => ({
      id: client.id ?? null,
      serverId: client.vpnServerId ?? null,
      ips: collectClientIpCandidates(client).map((ip) => normalizeIpForMatch(ip)).filter((x) => x.length > 0),
    }));
  }, [trafficDebugEnabled, visibleClients]);

  const flowIpDebugList = useMemo(() => {
    if (!trafficDebugEnabled || trafficFlows.length === 0) return [];
    return trafficFlows.slice(0, 30).map((flow) => ({
      connectionId: flow.connectionId,
      serverId: flow.serverId ?? null,
      realClientIp: flow.realClientIp ?? null,
      realClientIpNormalized: normalizeIpForMatch(flow.realClientIp),
      c2sDelta: flow.clientToServerBytesDelta,
      s2cDelta: flow.serverToClientBytesDelta,
    }));
  }, [trafficDebugEnabled, trafficFlows]);

  const visibleTrafficSegments = useMemo(() => {
    const maxDelta = visibleTrafficFlows.reduce((acc, flow) => {
      return Math.max(acc, flow.clientToServerBytesDelta ?? 0, flow.serverToClientBytesDelta ?? 0);
    }, 0);

    const result: TrafficSegment[] = [];

    for (const flow of visibleTrafficFlows) {
      if (flow.state === "failed" || flow.state === "disconnected") continue;

      const directions: Array<{ key: FlowDirection; delta: number }> = [
        { key: "clientToServer", delta: Math.max(0, flow.clientToServerBytesDelta ?? 0) },
        { key: "serverToClient", delta: Math.max(0, flow.serverToClientBytesDelta ?? 0) },
      ];

      for (const d of directions) {
        if (d.delta <= 0) continue;

        const id = `${flow.connectionId}:${d.key}`;
        const intensity = intensityFromDelta(d.delta, maxDelta);
        const weight = 1.2 + intensity * 6.8;
        const opacityBase = 0.25 + intensity * 0.75;
        const opacity = flow.isIdle ? opacityBase * 0.45 : opacityBase;
        const color = d.key === "clientToServer" ? "#ff9800" : "#00e5ff";
        const mapPath = offsetPolylinePositions(
          flow.from,
          flow.to,
          d.key === "clientToServer" ? 1 : -1
        );
        const label =
          d.key === "clientToServer"
            ? `C→S Δ: ${d.delta} B/s`
            : `S→C Δ: ${d.delta} B/s`;

        const created: TrafficSegment = {
          id,
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
          label,
        };
        result.push(created);
      }
    }

    return result;
  }, [visibleTrafficFlows]);

  const [pulseArcs, setPulseArcs] = useState<TimedGlobeArc[]>([]);
  const [pulseCables, setPulseCables] = useState<TimedGlobeCable[]>([]);
  const pulseSeqRef = useRef(0);
  const lastPulseAtRef = useRef<Map<string, number>>(new Map());
  const idleArcCacheRef = useRef<Map<string, GlobeArcDatum>>(new Map());
  const idleCableCacheRef = useRef<Map<string, GlobeCableDatum>>(new Map());
  const lastFlowEmitRef = useRef<Map<string, string>>(new Map());
  const globeArcsListRef = useRef<{ sig: string; list: GlobeArcDatum[] }>({ sig: "", list: [] });
  const globeCablesListRef = useRef<{ sig: string; list: GlobeCableDatum[] }>({ sig: "", list: [] });

  const pulseAnimateMs = animationMode === "offline" ? 2200 : 1500;
  const minPulseGapMs = animationMode === "offline" ? 400 : 180;

  const pruneExpiredPulses = (now: number) => {
    setPulseArcs((prev) => {
      const next = prev.filter((p) => p.expiresAt > now);
      return next.length === prev.length ? prev : next;
    });
    setPulseCables((prev) => {
      const next = prev.filter((p) => p.expiresAt > now);
      return next.length === prev.length ? prev : next;
    });
  };

  // Hub tick → new pulse with a fresh id. Existing pulse objects are never recreated (three-globe keeps animating).
  useEffect(() => {
    const now = Date.now();
    pruneExpiredPulses(now);

    const segmentById = new Map(visibleTrafficSegments.map((s) => [s.id, s]));
    const nextArcs: TimedGlobeArc[] = [];
    const nextCables: TimedGlobeCable[] = [];

    for (const flow of visibleTrafficFlows) {
      if (flow.state === "failed" || flow.state === "disconnected") continue;

      const inDelta = Math.max(0, flow.clientToServerBytesDelta ?? 0);
      const outDelta = Math.max(0, flow.serverToClientBytesDelta ?? 0);
      const directions: Array<{ key: FlowDirection; delta: number }> = [
        { key: "clientToServer", delta: inDelta },
        { key: "serverToClient", delta: outDelta },
      ];

      const emitKey = `${flow.serverId ?? "na"}:${flow.connectionId}`;
      const prevEmit = lastFlowEmitRef.current.get(emitKey);
      if (prevEmit === flow.emittedAtUtc) continue;
      lastFlowEmitRef.current.set(emitKey, flow.emittedAtUtc);

      for (const d of directions) {
        if (d.delta <= 0) continue;

        const segmentId = `${flow.connectionId}:${d.key}`;
        const segment = segmentById.get(segmentId);
        if (!segment) continue;

        const lastAt = lastPulseAtRef.current.get(segmentId) ?? 0;
        if (now - lastAt < minPulseGapMs) continue;
        lastPulseAtRef.current.set(segmentId, now);

        const pulseId = `${segmentId}:p${pulseSeqRef.current++}`;
        const expiresAt = now + pulseAnimateMs + 200;
        nextArcs.push({ ...buildGlobeArcFromSegment(segment, pulseId, false, pulseAnimateMs), expiresAt });
        nextCables.push({ ...buildGlobeCableFromSegment(segment, pulseId, false, pulseAnimateMs), expiresAt });
      }
    }

    if (nextArcs.length === 0) return;

    setPulseArcs((prev) => [...prev, ...nextArcs].slice(-MAX_TRAFFIC_PULSES));
    setPulseCables((prev) => [...prev, ...nextCables].slice(-MAX_TRAFFIC_PULSES));
  }, [trafficFlows, visibleTrafficFlows, visibleTrafficSegments, pulseAnimateMs, minPulseGapMs]);

  useEffect(() => {
    const timer = window.setInterval(() => pruneExpiredPulses(Date.now()), 400);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!trafficDebugEnabled) return;
    if (trafficFlows.length === 0 && visibleTrafficSegments.length === 0) return;

    const unmatchedByReason = unmatchedTrafficDebug.reduce<Record<string, number>>((acc, item) => {
      acc[item.reason] = (acc[item.reason] ?? 0) + 1;
      return acc;
    }, {});

     
    console.debug("[TrafficFlowDebug] summary", {
      incomingFlows: trafficFlows.length,
      matchedFlows: visibleTrafficFlows.length,
      renderedSegments: visibleTrafficSegments.length,
      unmatchedFlows: unmatchedTrafficDebug.length,
      unmatchedByReason,
      clientsWithCoords: visibleClients.length,
      serversOnMap: serverMarkers.length > 0 ? serverMarkers.length : (serverLocation ? 1 : 0),
    });

     
    console.debug("[TrafficFlowDebug] clients sample", clientDebugSample);
     
    console.debug("[TrafficFlowDebug] incoming flows sample", flowDebugSample);
    console.debug("[TrafficFlowDebug] client IP list", clientIpDebugList);
    console.debug("[TrafficFlowDebug] flow IP list", flowIpDebugList);

    if (unmatchedTrafficDebug.length > 0) {
       
      console.debug("[TrafficFlowDebug] unmatched sample", unmatchedTrafficDebug.slice(0, 10));
    }
  }, [
    trafficDebugEnabled,
    trafficFlows.length,
    visibleTrafficFlows.length,
    visibleTrafficSegments.length,
    unmatchedTrafficDebug,
    clientDebugSample,
    flowDebugSample,
    clientIpDebugList,
    flowIpDebugList,
    visibleClients.length,
    serverMarkers.length,
    serverLocation,
  ]);

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
    const now = Date.now();
    const idleCache = idleArcCacheRef.current;
    const usedIdle = new Set<string>();
    const idleArcs: GlobeArcDatum[] = [];

    for (const segment of visibleTrafficSegments) {
      if (!segment.isIdle) continue;
      usedIdle.add(segment.id);
      const cached = idleCache.get(segment.id);
      if (cached) {
        idleArcs.push(cached);
        continue;
      }
      const created = buildGlobeArcFromSegment(segment, segment.id, true, 0);
      idleCache.set(segment.id, created);
      idleArcs.push(created);
    }
    for (const key of [...idleCache.keys()]) {
      if (!usedIdle.has(key)) idleCache.delete(key);
    }

    const activePulses = pulseArcs.filter((pulse) => pulse.expiresAt > now);
    const built = [...idleArcs, ...activePulses];
    const sig = built.map((a) => a.id).join("\n");
    if (sig === globeArcsListRef.current.sig) {
      return globeArcsListRef.current.list;
    }
    globeArcsListRef.current = { sig, list: built };
    return built;
  }, [visibleTrafficSegments, pulseArcs]);

  const globeCablePathsData = useMemo(() => {
    const now = Date.now();
    const idleCache = idleCableCacheRef.current;
    const usedIdle = new Set<string>();
    const idleCables: GlobeCableDatum[] = [];

    for (const segment of visibleTrafficSegments) {
      if (!segment.isIdle) continue;
      usedIdle.add(segment.id);
      const cached = idleCache.get(segment.id);
      if (cached) {
        idleCables.push(cached);
        continue;
      }
      const created = buildGlobeCableFromSegment(segment, segment.id, true, 0);
      idleCache.set(segment.id, created);
      idleCables.push(created);
    }
    for (const key of [...idleCache.keys()]) {
      if (!usedIdle.has(key)) idleCache.delete(key);
    }

    const activePulses = pulseCables.filter((pulse) => pulse.expiresAt > now);
    const built = [...idleCables, ...activePulses];
    const sig = built.map((a) => a.id).join("\n");
    if (sig === globeCablesListRef.current.sig) {
      return globeCablesListRef.current.list;
    }
    globeCablesListRef.current = { sig, list: built };
    return built;
  }, [visibleTrafficSegments, pulseCables]);

  const renderedStats = useMemo(() => {
    const now = Date.now();
    return {
      renderedFlows: visibleTrafficFlows.length,
      totalFlows: trafficFlows.length,
      flowLimit: renderBudget.maxFlows,
      renderedSegments: visibleTrafficSegments.length,
      activePulses: pulseArcs.filter((p) => p.expiresAt > now).length,
      renderedPoints: globePointsData.length,
      totalPoints:
        visibleClients.length + (serverMarkers.length > 0 ? serverMarkers.length : (serverLocation ? 1 : 0)),
      totalServers: serverMarkers.length > 0 ? serverMarkers.length : (serverLocation ? 1 : 0),
      pointLimit: renderBudget.maxPoints,
    };
  }, [
    visibleTrafficFlows,
    trafficFlows,
    renderBudget.maxFlows,
    visibleTrafficSegments,
    pulseArcs,
    globePointsData,
    visibleClients,
    serverLocation,
    serverMarkers,
    renderBudget.maxPoints,
  ]);

  const globeDash = useMemo(() => {
    if (animationMode === "offline") {
      return {
        arcLength: 0.2,
        arcGap: 0.65,
        arcAnimateMs: 2200,
        pathLength: 0.09,
        pathGap: 0.24,
        pathAnimateMs: 2100,
      };
    }
    return {
      arcLength: 0.18,
      arcGap: 0.68,
      arcAnimateMs: 1500,
      pathLength: 0.1,
      pathGap: 0.22,
      pathAnimateMs: 1350,
    };
  }, [animationMode]);

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
            {renderedStats.renderedSegments} | Pulses: {renderedStats.activePulses} | Servers:{" "}
            {renderedStats.totalServers} | Points:{" "}
            {renderedStats.renderedPoints}/{renderedStats.totalPoints} (limit {renderedStats.pointLimit})
          </span>
          <span className="vpn-map-stats">C→S: orange | S→C: cyan | thicker/brighter = more traffic</span>
        </div>

        {viewMode === "map" ? (
            <MapContainer className="map-container-full-size" center={DEFAULT_MAP_CENTER} zoom={4}>
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

              {/* 2D map mode is intentionally static (no traffic line animation). */}
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
                    arcColor="dashColors"
                    arcLabel="label"
                    arcCurveResolution={24}
                    arcDashLength={globeDash.arcLength}
                    arcDashGap={globeDash.arcGap}
                    arcDashAnimateTime="dashAnimateMs"
                    arcsTransitionDuration={0}
                    pathsData={globeTrafficLayer === "submarine" ? globeCablePathsData : []}
                    pathPoints="points"
                    pathPointLat="lat"
                    pathPointLng="lng"
                    pathPointAlt="alt"
                    pathColor="color"
                    pathStroke={(d: unknown) => (d as { width: number }).width}
                    pathLabel="label"
                    pathDashLength={globeDash.pathLength}
                    pathDashGap={globeDash.pathGap}
                    pathDashAnimateTime="dashAnimateMs"
                    pathTransitionDuration={0}
                />
              </Suspense>
            </div>
        )}
      </div>
  );
};

export default VpnMap;
