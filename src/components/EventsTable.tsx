import React from "react";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";
import { formatDateWithOffset } from "../utils/utils";

interface VpnEvent {
  id: number;
  vpnServerId: number;
  eventType: string;
  commonName: string;
  realAddress: string;
  virtualAddress: string;
  connectedSince: string | null;
  message: string | null;
  createDate: string;
  lastUpdate: string;
}

interface EventsTableProps {
  events: VpnEvent[];
  totalEvents: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  loading: boolean;
}

const safeFormatDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return isNaN(date.getTime()) ? "" : formatDateWithOffset(date);
};

const EventsTable: React.FC<EventsTableProps> = ({
  events,
  totalEvents,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  loading,
}) => {
  const rows = events.map((event, index) => ({
    id: event.id || index + 1,
    eventType: event.eventType,
    commonName: event.commonName,
    realAddress: event.realAddress,
    virtualAddress: event.virtualAddress,
    connectedSince: safeFormatDate(event.connectedSince),
    createDate: safeFormatDate(event.createDate),
  }));

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "eventType", headerName: "Type", flex: 0.7 },
    { field: "commonName", headerName: "Common Name", flex: 1 },
    { field: "realAddress", headerName: "Real Address", flex: 0.8 },
    { field: "virtualAddress", headerName: "Virtual Address", flex: 0.8 },
    { field: "connectedSince", headerName: "Connected Since", flex: 1 },
    { field: "createDate", headerName: "Create Date", flex: 1 },
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
          rowCount={totalEvents}
          paginationModel={{ pageSize, page }}
          onPaginationModelChange={(newModel) => {
            onPageChange(newModel.page);
            onPageSizeChange(newModel.pageSize);
          }}
          loading={loading}
          disableColumnFilter
          disableColumnMenu
          localeText={{
            noRowsLabel: "📭 No events logged",
          }}
        />
      </div>
    </CustomThemeProvider>
  );
};

export default EventsTable;
