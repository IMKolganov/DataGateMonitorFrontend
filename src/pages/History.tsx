import React, { useEffect, useState } from "react";
import axios from "axios";
import { ConnectedClient } from "../components/types";
import ClientsTable from "../components/ClientsTable";
import VpnMap from "../components/VpnMap";
import { FaSync } from "react-icons/fa";

const History: React.FC = () => {
  const [clients, setClients] = useState<ConnectedClient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistoryClients();
  }, []);

  const fetchHistoryClients = async () => {
    setLoading(true);
    try {
      const response = await axios.get<ConnectedClient[]>("http://localhost:5580/OpenVpnServer/GetAllHistoryClients");
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching history clients", error);
      setError("Failed to load history clients");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>VPN Connection History</h2>

      <button className="btn secondary" onClick={fetchHistoryClients} disabled={loading}>
        <FaSync className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
      </button>

      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && clients.length > 0 ? (
        <>
          <ClientsTable clients={clients} />
          <h2>Historical VPN Client Locations</h2>
          <VpnMap clients={clients} />
        </>
      ) : (
        !loading && <p>No historical clients found.</p>
      )}
    </div>
  );
};

export default History;
