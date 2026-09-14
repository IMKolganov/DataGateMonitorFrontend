import { useParams } from "react-router-dom";
import { AdminServerPageGate } from "../components/AdminServerPageGate";
import { ServerAccessBody } from "./VpnAccessSettings/ServerAccessBody";
import "../css/Settings.css";

/**
 * Server details → Access: quota plans and personal grants for the opened server.
 */
export function ServerAccessTab() {
  const { vpnServerId = "" } = useParams<{ vpnServerId: string }>();
  const id = Number(vpnServerId);

  return (
    <AdminServerPageGate featureLabel="Server access">
      {!Number.isFinite(id) || id <= 0 ? (
        <p className="text-muted">Invalid server.</p>
      ) : (
        <ServerAccessBody vpnServerId={id} />
      )}
    </AdminServerPageGate>
  );
}

export default ServerAccessTab;
