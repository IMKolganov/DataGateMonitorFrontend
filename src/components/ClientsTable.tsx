import React from "react";
import { ConnectedClient } from "./types";
import { formatBytes } from "./utils";

interface ClientsTableProps {
  clients: ConnectedClient[];
}

const ClientsTable: React.FC<ClientsTableProps> = ({ clients }) => {
  return (
    <div style={{ position: "relative" }}>
      <table border={1} style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Common Name</th>
            <th>Remote Address</th>
            <th>Local Address</th>
            <th>Bytes Received</th>
            <th>Bytes Sent</th>
            <th>Connected Since</th>
            <th>Country</th>
            <th>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {clients.length > 0 ? (
            clients.map((client) => (
              <tr key={client.id} className="fade-in">
                <td>{client.id}</td>
                <td>{client.commonName}</td>
                <td>{client.remoteIp}</td>
                <td>{client.localIp}</td>
                <td>{formatBytes(client.bytesReceived)}</td>
                <td>{formatBytes(client.bytesSent)}</td>
                <td>{new Date(client.connectedSince).toLocaleString()}</td>
                <td>{`${client.country}, ${client.region}, ${client.city}`}</td>
                <td>{new Date(client.lastUpdated).toLocaleString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9} style={{ textAlign: "center" }}>📭 No connected clients</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ClientsTable;
