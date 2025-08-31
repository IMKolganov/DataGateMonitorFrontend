// src/pages/ServersOverview/GeoMap.tsx
import GeoPointsMap from "../../components/GeoPointsMap";

type Props = {
  from: Date | string;
  to: Date | string;
  vpnServerId?: number | null;
  externalId?: string | null;
};

export default function GeoMap({ from, to, vpnServerId = null, externalId = null }: Props) {
  return (
    <GeoPointsMap
      from={from}
      to={to}
      vpnServerId={vpnServerId}
      externalId={externalId}
      onlyWithCoordinates
      center={[45, 37]}
      zoom={4}
      serverLocation={[35.135, 33.35]}
    />
  );
}