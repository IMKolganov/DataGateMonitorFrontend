import GeoPointsMap from "../../components/GeoPointsMap";

export default function GeoPointsPage() {
  const from = new Date("2015-08-01T00:00:00Z");
  const to = new Date("2035-08-24T23:59:59Z");

  return (
    <GeoPointsMap
      apiUrl="/api/OpenVpnServerClients/overview/points"
      from={from}
      to={to}
      vpnServerId={null}
      externalId={null}
      onlyWithCoordinates={true}
      center={[45, 37]}
      zoom={4}
      serverLocation={[35.135, 33.35]}
    />
  );
}
