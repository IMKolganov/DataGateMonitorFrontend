// src/pages/ServersOverview/GeoMap.tsx
import { useMemo } from "react";

import GeoPointsMap from "../../components/settings/GeoPointsMap.tsx";
import { useGetApiV2OpenVpnServersGetAll } from "../../api/orval/vpn-servers-v2/vpn-servers-v2";
import type { VpnServerV2Dto, VpnServersV2Response } from "../../api/orvalModelShim";

type Props = {
  from: Date | string;
  to: Date | string;
  vpnServerId?: number | null;
  externalId?: string | null;
};
const DEFAULT_GEO_CENTER: [number, number] = [45, 37];

function withLatLng(s: VpnServerV2Dto): s is VpnServerV2Dto & {
  id: number;
  latitude: number;
  longitude: number;
} {
  return (
    typeof s.id === "number" &&
    typeof s.latitude === "number" &&
    typeof s.longitude === "number" &&
    Number.isFinite(s.latitude) &&
    Number.isFinite(s.longitude)
  );
}

export default function GeoMap({ from, to, vpnServerId = null, externalId = null }: Props) {
  const { data: serversData } = useGetApiV2OpenVpnServersGetAll({});

  const vpnServerMarkers = useMemo(() => {
    const list = (serversData as VpnServersV2Response | undefined)?.vpnServers ?? [];
    const withCoords = list.filter((s) => !s.isDeleted).filter(withLatLng);

    if (vpnServerId != null) {
      const one = withCoords.find((s) => s.id === vpnServerId);
      if (!one) return [];
      const name = one.serverName?.trim() || `VPN server #${one.id}`;
      return [{ id: one.id, name, position: [one.latitude, one.longitude] as [number, number] }];
    }

    return withCoords.map((s) => ({
      id: s.id,
      name: s.serverName?.trim() || `VPN server #${s.id}`,
      position: [s.latitude, s.longitude] as [number, number],
    }));
  }, [serversData, vpnServerId]);

  return (
    <GeoPointsMap
      from={from}
      to={to}
      vpnServerId={vpnServerId}
      externalId={externalId}
      onlyWithCoordinates
      center={DEFAULT_GEO_CENTER}
      zoom={4}
      vpnServerMarkers={vpnServerMarkers}
    />
  );
}
