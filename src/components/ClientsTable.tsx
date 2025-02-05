import React, { useState } from "react";
import { GridColDef } from "@mui/x-data-grid";
import { ConnectedClient } from "./types";
import { formatBytes } from "./utils";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";

interface ClientsTableProps {
  clients: ConnectedClient[];
}

const ClientsTable: React.FC<ClientsTableProps> = ({ clients }) => {
  const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });

  const rows = clients.map((client, index) => ({
    id: client.id || index + 1,
    commonName: client.commonName,
    remoteIp: client.remoteIp,
    localIp: client.localIp,
    bytesReceived: formatBytes(client.bytesReceived),
    bytesSent: formatBytes(client.bytesSent),
    connectedSince: new Date(client.connectedSince).toLocaleString(),
    country: `${client.country}, ${client.region}, ${client.city}`,
  }));

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "commonName", headerName: "Common Name", flex: 1 },
    { field: "remoteIp", headerName: "Remote Address", flex: 1 },
    { field: "localIp", headerName: "Local Address", flex: 1 },
    { field: "bytesReceived", headerName: "Bytes Received", flex: 1 },
    { field: "bytesSent", headerName: "Bytes Sent", flex: 1 },
    { field: "connectedSince", headerName: "Connected Since", flex: 1 },
    { field: "country", headerName: "Country", flex: 1 },
  ];

  return (
    <CustomThemeProvider>
      <div
        style={{
          width: "100%",
          backgroundColor: "#0d1117",
          padding: "10px",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <StyledDataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={[5, 10, 20, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableColumnFilter
          disableColumnMenu
          localeText={{
            noRowsLabel: "📭 No connected clients",
          }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default ClientsTable;
