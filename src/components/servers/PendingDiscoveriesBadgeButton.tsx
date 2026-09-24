import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaInbox } from "react-icons/fa";
import { getCurrentUser, isAdmin } from "../../utils/auth/authSelectors";
import { unwrapPendingDiscoveries } from "../../utils/servers/pendingServerDiscovery";
import { useGetApiOpenVpnServersDiscoveriesPending } from "../../api/orval/vpn-servers/vpn-servers";

/**
 * Admin shortcut to the pending VPN discovery inbox.
 */
export function PendingDiscoveriesBadgeButton() {
  const user = getCurrentUser();
  const admin = isAdmin(user);
  const navigate = useNavigate();

  const pendingQuery = useGetApiOpenVpnServersDiscoveriesPending({
    query: {
      enabled: admin,
      refetchInterval: admin ? 30_000 : false,
      refetchOnWindowFocus: admin,
    },
  });

  const count = useMemo(
    () => unwrapPendingDiscoveries(pendingQuery.data).length,
    [pendingQuery.data],
  );

  if (!admin || count <= 0) return null;

  return (
    <button
      type="button"
      className="btn secondary"
      onClick={() => navigate("/servers/pending-discoveries")}
      title={`${count} pending server request${count === 1 ? "" : "s"}`}
    >
      <span className="icon">{FaInbox({ className: "icon" })}</span>
      Pending ({count})
    </button>
  );
}
