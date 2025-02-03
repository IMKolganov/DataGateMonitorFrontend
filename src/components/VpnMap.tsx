import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import Cookies from "js-cookie";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { ConnectedClient } from "./types";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

const serverIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const defaultIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const ChangeView = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

interface VpnMapProps {
  clients: ConnectedClient[];
}

const tileLayers = {
  "Carto Dark": {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">Carto</a>',
  },
  "OpenStreetMap": {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  "Esri Dark Gray": {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; <a href="https://www.arcgis.com/">Esri</a>',
  },
  "Google Maps Dark": {
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
  },
};

const VpnMap: React.FC<VpnMapProps> = ({ clients }) => {
  const serverLocation: [number, number] = [35.135, 33.350];
  const defaultCenter: [number, number] = [45, 37];
  const [selectedLayer, setSelectedLayer] = useState<keyof typeof tileLayers>(
    Cookies.get("selectedMapLayer") as keyof typeof tileLayers || "Carto Dark"
  );

  useEffect(() => {
    Cookies.set("selectedMapLayer", selectedLayer, { expires: 365 });
  }, [selectedLayer]);

  return (
    <div style={{ height: "650px", width: "100%", marginTop: "20px" }}>
      <div style={{ marginBottom: "10px", textAlign: "right" }}>
        <label className="dropdown">
          <strong>Map Style:</strong>&nbsp;
          <select
            className="dropdown-select"
            value={selectedLayer}
            onChange={(e) => setSelectedLayer(e.target.value as keyof typeof tileLayers)}
          >
            {Object.keys(tileLayers).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
      </div>

      <MapContainer style={{ height: "600px", width: "100%" }}>
        <ChangeView center={defaultCenter} zoom={4} />
        <TileLayer url={tileLayers[selectedLayer].url} attribution={tileLayers[selectedLayer].attribution} />

        <Marker position={serverLocation} icon={serverIcon}>
          <Popup>
            <strong>VPN Server</strong> <br />
            🌎 Location: {serverLocation[0]}, {serverLocation[1]}
          </Popup>
        </Marker>

        {clients
          .filter((client) => client.latitude && client.longitude)
          .map((client) => (
            <Marker key={client.id} position={[client.latitude, client.longitude]} icon={defaultIcon}>
              <Popup>
                <strong>{client.commonName}</strong> <br />
                {client.city}, {client.country} <br />
                {client.remoteIp} <br />
                📥 {client.bytesReceived} Bytes | 📤 {client.bytesSent} Bytes
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
};

export default VpnMap;
