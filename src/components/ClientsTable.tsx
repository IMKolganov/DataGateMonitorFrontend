import React from "react";
import { GridColDef } from "@mui/x-data-grid";
import { ConnectedClient } from "../utils/types";
import { formatBytes, formatDateWithOffset } from "../utils/utils";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";

interface ClientsTableProps {
  clients: ConnectedClient[];
  totalClients: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  loading: boolean;
}

const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  totalClients,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  loading,
}) => {
  const rows = clients.map((client, index) => ({
    id: client.id || index + 1,
    commonName: client.commonName,
    externalId: client.externalId,
    tgUsername: client.tgUsername,
    tgFirstName: client.tgFirstName,
    tgLastName: client.tgLastName,
    remoteIp: client.remoteIp,
    localIp: client.localIp,
    bytesReceived: formatBytes(client.bytesReceived),
    bytesSent: formatBytes(client.bytesSent),
    connectedSince: formatDateWithOffset(new Date(client.connectedSince)),
    country: `${client.country}, ${client.region}, ${client.city}`,
  }));

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "commonName", headerName: "Common Name", flex: 1 },
    { field: "externalId", headerName: "External Id", flex:  0.6 },
    { field: "tgUsername", headerName: "Telegram Username", flex:  0.6 },
    { field: "tgFirstName", headerName: "Telegram FirstName", flex:  0.6 },
    { field: "tgLastName", headerName: "Telegram LastName", flex:  0.6 },
    { field: "remoteIp", headerName: "Remote Address", flex: 0.6 },
    { field: "localIp", headerName: "Local Address", flex: 0.6 },
    { field: "bytesReceived", headerName: "Bytes Received", flex: 0.6 },
    { field: "bytesSent", headerName: "Bytes Sent", flex: 0.6 },
    { field: "connectedSince", headerName: "Connected Since", flex: 0.7 },
    { field: "country", headerName: "Country", flex: 0.6 },
  ];

  return (
    <CustomThemeProvider>
      <div
        style={{
          width: "100%",
          minWidth: 0,
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
          paginationMode="server"
          rowCount={totalClients}
          paginationModel={{ pageSize, page }}
          onPaginationModelChange={(newModel) => {
            onPageChange(newModel.page);
            onPageSizeChange(newModel.pageSize);
          }}
          loading={loading}
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
