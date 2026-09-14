import { Link, useSearchParams } from "react-router-dom";
import { FaUserShield } from "react-icons/fa";
import { useGetApiV3OpenVpnServersGetAll } from "../../api/orval/vpn-servers-v3/vpn-servers-v3";
import type { VpnServersV3Response } from "../../api/orvalModelShim";
import type { ApiEnvelope } from "../TelegramBotSettings/unwrapApiResponse";
import { unwrapMaybeApiResponse } from "../TelegramBotSettings/unwrapApiResponse";
import { ServerAccessBody } from "./ServerAccessBody";
import "../../css/Settings.css";

/**
 * Settings → Access: pick a server, then set quota plans and personal grants.
 */
export function VpnAccessSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedServerId = Number(searchParams.get("serverId") || "") || 0;

  const setSelectedServerId = (id: number) => {
    const next = new URLSearchParams(searchParams);
    if (id > 0) next.set("serverId", String(id));
    else next.delete("serverId");
    setSearchParams(next, { replace: true });
  };

  const { data: serversData } = useGetApiV3OpenVpnServersGetAll({});
  const servers =
    unwrapMaybeApiResponse<VpnServersV3Response>(
      serversData as VpnServersV3Response | ApiEnvelope<VpnServersV3Response> | undefined,
    )?.vpnServers ?? [];

  return (
    <div>
      <h2 className="settings-page__h2-with-icon">
        <FaUserShield className="icon" aria-hidden />
        <span>Access</span>
      </h2>
      <div className="settings-divider" />

      <p className="settings-item-description">
        Choose which quota plans may use a server, then grant or block named users on top of those
        plans. The same controls are on each server&apos;s Access tab. Per-user rules also remain on
        each{" "}
        <Link to="/settings/users" className="vpn-access-inline-link">
          user profile
        </Link>
        .
      </p>

      <div className="header-bar header-bar--mb-12 vpn-access-toolbar">
        <div className="left-buttons">
          <select
            id="vpn-access-server"
            name="vpnAccessServer"
            className="input"
            value={selectedServerId > 0 ? String(selectedServerId) : ""}
            onChange={(e) => setSelectedServerId(Number(e.target.value) || 0)}
            aria-label="VPN server"
          >
            <option value="">Select server…</option>
            {servers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.serverName ?? `Server #${server.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedServerId <= 0 ? (
        <p className="text-muted">
          Choose a server to set quota plans and grant people access.
        </p>
      ) : (
        <ServerAccessBody vpnServerId={selectedServerId} />
      )}
    </div>
  );
}

export default VpnAccessSettings;
