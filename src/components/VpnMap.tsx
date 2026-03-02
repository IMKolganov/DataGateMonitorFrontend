import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import Cookies from "js-cookie";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { VpnClientInfoDto } from "../api/orval/model";

import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

const MARKER_BASE =
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x";
const MARKER_SHADOW =
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png";

const markerColors = ["red", "blue", "green", "orange", "yellow", "violet", "grey", "black"] as const;
type MarkerColor = (typeof markerColors)[number];

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

export const serverIcon = createMarkerIcon("blue");

const ChangeView = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

interface VpnMapProps {
  clients: VpnClientInfoDto[];
  serverLocation?: [number, number] | null;
  serverName?: string | null;
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

const VpnMap: React.FC<VpnMapProps> = ({ clients, serverLocation, serverName }) => {
  const defaultCenter: [number, number] = [45, 37];

  const [selectedLayer, setSelectedLayer] = useState<keyof typeof tileLayers>(
      (Cookies.get("selectedMapLayer") as keyof typeof tileLayers) || "Carto Dark"
  );
  const [pointColor, setPointColor] = useState<MarkerColor>(
      (Cookies.get("selectedPointColor") as MarkerColor) || "red"
  );

  useEffect(() => {
    Cookies.set("selectedMapLayer", selectedLayer, { expires: 365 });
  }, [selectedLayer]);
  useEffect(() => {
    Cookies.set("selectedPointColor", pointColor, { expires: 365 });
  }, [pointColor]);

  const clientIcon = useMemo(() => createMarkerIcon(pointColor), [pointColor]);

  const visibleClients = useMemo(
      () =>
          clients.filter(
              (c) => typeof c.latitude === "number" && typeof c.longitude === "number"
          ),
      [clients]
  );

  return (
      <div style={{ height: "650px", width: "100%", marginTop: "20px" }}>
        <div
            style={{
              marginBottom: "10px",
              textAlign: "right",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
        >
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
        </div>

        <MapContainer style={{ height: "600px", width: "100%" }} center={defaultCenter} zoom={4}>
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
        </MapContainer>
      </div>
  );
};

export default VpnMap;
