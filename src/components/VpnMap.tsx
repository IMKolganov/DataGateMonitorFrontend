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

const VpnMap: React.FC<VpnMapProps> = ({ clients, serverLocation, serverName, trafficFlows = [] }) => {
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
      const ip = (c.proxyRealIp ?? c.remoteIp ?? "").trim();
      if (!ip) continue;
      index.set(ip, [c.latitude, c.longitude]);
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
      }
    }
    return index;
  }, [visibleClients]);

  const visibleTrafficFlows = useMemo(() => {
    if (!serverLocation) return [];
    return trafficFlows
      .map((f) => {
        const ip = (f.realClientIp ?? "").trim();
        const usernameKey = (f.username ?? f.clientRef ?? "").trim().toLowerCase();
        const from = clientGeoByIp.get(ip) ?? (usernameKey ? clientGeoByIdentity.get(usernameKey) : undefined);
        if (!from) return null;

        const inDelta = Math.max(0, f.clientToServerBytesDelta ?? 0);
        const outDelta = Math.max(0, f.serverToClientBytesDelta ?? 0);
        const activity = inDelta + outDelta;
        const weight = Math.min(8, Math.max(1.5, 1.5 + Math.log10(activity + 1)));
        const color =
          f.state === "failed"
            ? "#ff3b30"
            : f.state === "disconnected"
              ? "#888888"
              : f.isIdle
                ? "#7aa2ff"
                : "#00e676";
        const opacity = f.isIdle ? 0.35 : 0.9;

        return { ...f, from, to: serverLocation, color, weight, opacity, activity };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => {
        if (a.isIdle !== b.isIdle) return a.isIdle ? 1 : -1;
        if (a.activity !== b.activity) return b.activity - a.activity;
        return a.connectionId.localeCompare(b.connectionId);
      })
      .slice(0, renderBudget.maxFlows);
  }, [trafficFlows, clientGeoByIp, clientGeoByIdentity, serverLocation, renderBudget.maxFlows]);

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

    if (serverLocation) {
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
  }, [visibleClients, serverLocation, serverName, renderBudget.maxPoints]);

  const globeArcsData = useMemo(() => {
    return visibleTrafficFlows.map((flow) => {
      const [startLat, startLng] = flow.from;
      const [endLat, endLng] = flow.to;
      return {
        id: flow.connectionId,
        startLat,
        startLng,
        endLat,
        endLng,
        color: flow.color,
        label: `<strong>${flow.connectionId}</strong><br/>State: ${flow.state}${flow.isIdle ? " (idle)" : " (active)"}<br/>C→S Δ: ${flow.clientToServerBytesDelta} B/s<br/>S→C Δ: ${flow.serverToClientBytesDelta} B/s`,
        isIdle: flow.isIdle,
      };
    });
  }, [visibleTrafficFlows]);

  const renderedStats = useMemo(() => {
    return {
      renderedFlows: visibleTrafficFlows.length,
      totalFlows: trafficFlows.length,
      flowLimit: renderBudget.maxFlows,
      renderedPoints: globePointsData.length,
      totalPoints: visibleClients.length + (serverLocation ? 1 : 0),
      pointLimit: renderBudget.maxPoints,
    };
  }, [
    visibleTrafficFlows.length,
    trafficFlows.length,
    renderBudget.maxFlows,
    globePointsData.length,
    visibleClients.length,
    serverLocation,
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
          <span className="vpn-map-stats">
            Flows: {renderedStats.renderedFlows}/{renderedStats.totalFlows} (limit {renderedStats.flowLimit}) | Points:{" "}
            {renderedStats.renderedPoints}/{renderedStats.totalPoints} (limit {renderedStats.pointLimit})
          </span>
        </div>

        {viewMode === "map" ? (
            <MapContainer className="map-container-full-size" center={defaultCenter} zoom={4}>
              <ChangeView center={defaultCenter} zoom={4} />
              <TileLayer
                  url={tileLayers[selectedLayer].url}
                  attribution={tileLayers[selectedLayer].attribution}
              />

              {serverLocation && (
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
                      key={client.id}
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

              {visibleTrafficFlows.map((flow) => (
                  <Polyline
                      key={flow.connectionId}
                      positions={[flow.from, flow.to]}
                      pathOptions={{ color: flow.color, weight: flow.weight, opacity: flow.opacity }}
                  >
                    <Popup>
                      <strong>{flow.connectionId}</strong>
                      <br />
                      State: {flow.state} {flow.isIdle ? "(idle)" : "(active)"}
                      <br />
                      C→S Δ: {flow.clientToServerBytesDelta} B/s
                      <br />
                      S→C Δ: {flow.serverToClientBytesDelta} B/s
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
                    arcsData={globeArcsData}
                    arcStartLat="startLat"
                    arcStartLng="startLng"
                    arcEndLat="endLat"
                    arcEndLng="endLng"
                    arcColor={(d: unknown) => [(d as { color: string }).color, (d as { color: string }).color]}
                    arcLabel="label"
                    arcCurveResolution={24}
                    arcDashLength={0.25}
                    arcDashGap={0.7}
                    arcDashAnimateTime={(d: unknown) => ((d as { isIdle: boolean }).isIdle ? 0 : 1200)}
                    arcsTransitionDuration={0}
                />
              </Suspense>
            </div>
        )}
      </div>
  );
};

export default VpnMap;
