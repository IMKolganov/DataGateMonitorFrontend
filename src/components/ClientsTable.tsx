import React from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { ConnectedClient } from "./types";
import { formatBytes } from "./utils";
import { ThemeProvider, createTheme, styled } from "@mui/material/styles";

interface ClientsTableProps {
  clients: ConnectedClient[];
}

const githubDarkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0d1117",
      paper: "#161b22",
    },
    text: {
      primary: "#c9d1d9",
      secondary: "#8b949e",
    },
  },
});

const StyledDataGrid = styled(DataGrid)({
  fontFamily: "monospace",
  border: "none",
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#161b22",
    color: "#c9d1d9",
    fontSize: "14px",
    fontWeight: "bold",
    borderBottom: "1px solid #30363d",
  },
  "& .MuiDataGrid-cell": {
    color: "#c9d1d9",
    borderBottom: "1px solid #30363d",
  },
  "& .MuiDataGrid-row": {
    backgroundColor: "#0d1117",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "#21262d",
  },
  "& .MuiDataGrid-footerContainer": {
    backgroundColor: "#161b22",
    color: "#c9d1d9",
    borderTop: "1px solid #30363d",
  },
  "& .MuiDataGrid-root": {
    overflow: "hidden",
  },
  "& .MuiDataGrid-virtualScroller": {
    overflowX: "hidden",
    overflowY: "auto",
    scrollbarWidth: "thin",
    scrollbarColor: "#30363d #0d1117",
    "&::-webkit-scrollbar": {
      width: "8px",
      height: "8px",
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "#0d1117",
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "#30363d",
      borderRadius: "4px",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      backgroundColor: "#484f58",
    },
  },
  "& .MuiDataGrid-scrollbar": {
    display: "none",
  },
});

const ClientsTable: React.FC<ClientsTableProps> = ({ clients }) => {
  if (!clients || clients.length === 0) {
    return <p style={{ textAlign: "center", padding: "20px" }}>📭 No connected clients</p>;
  }

  const rows = clients.map((client, index) => ({
    id: client.id || index + 1,
    commonName: client.commonName,
    remoteIp: client.remoteIp,
    localIp: client.localIp,
    bytesReceived: formatBytes(client.bytesReceived),
    bytesSent: formatBytes(client.bytesSent),
    connectedSince: new Date(client.connectedSince).toLocaleString(),
    country: `${client.country}, ${client.region}, ${client.city}`,
    // lastUpdated: new Date(client.lastUpdated).toLocaleString(),
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
    // { field: "lastUpdated", headerName: "Last Updated", flex: 1 },
  ];

  return (
    <ThemeProvider theme={githubDarkTheme}>
      <div
        style={{
          height: 500,
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
          pageSizeOptions={[5, 10, 20, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableColumnFilter
          disableColumnMenu
          aria-hidden={false}
        />
      </div>
    </ThemeProvider>
  );
};

export default ClientsTable;
