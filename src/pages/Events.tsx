import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StyledDataGrid from "../components/TableStyle";
import CustomThemeProvider from "../components/ThemeProvider";
import type { GridColDef } from "@mui/x-data-grid";
import { FaSync } from "react-icons/fa";
import { fetchEvents } from "../utils/api";
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

const safeFormatDate = (value: any) => {
  if (!value) return "";
  const date = new Date(value);
  return isNaN(date.getTime()) ? "" : formatDateWithOffset(date);
};

const Events: React.FC = () => {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();
  const [events, setEvents] = useState<VpnEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalEvents, setTotalEvents] = useState(0);

  const loadEvents = async () => {
    if (!vpnServerId) return;
    setLoading(true);
    try {
      const res = await fetchEvents(vpnServerId, page + 1, pageSize);
      setEvents(res.events || []);
      setTotalEvents(res.totalCount || 0);
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setEvents([]);
      setTotalEvents(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [vpnServerId, page, pageSize]);

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
    { field: "id", headerName: "ID", width: 80 },
    { field: "eventType", headerName: "Type", flex: 0.7 },
    { field: "commonName", headerName: "Common Name", flex: 1 },
    { field: "realAddress", headerName: "Real Address", flex: 0.9 },
    { field: "virtualAddress", headerName: "Virtual Address", flex: 0.8 },
    { field: "connectedSince", headerName: "Connected Since", flex: 1 },
    { field: "createDate", headerName: "Create Date", flex: 1 },
  ];

  return (
    <CustomThemeProvider>
      <div>
        <div className="header-bar">
          <div className="left-buttons">
            <button className="btn secondary" onClick={loadEvents} disabled={loading}>
              {FaSync({ className: `icon ${loading ? "icon-spin" : ""}` })} Refresh
            </button>
          </div>
        </div>

        <h2>Events for Server ID: {vpnServerId}</h2>

        <div style={{ marginTop: "1rem" }}>
          <StyledDataGrid
            rows={rows}
            columns={columns}
            pageSizeOptions={[5, 10, 20, 50]}
            paginationMode="server"
            rowCount={totalEvents}
            paginationModel={{ pageSize, page }}
            onPaginationModelChange={(model) => {
              setPage(model.page);
              setPageSize(model.pageSize);
            }}
            loading={loading}
            disableColumnFilter
            disableColumnMenu
            localeText={{
              noRowsLabel: "📭 No events logged",
            }}
          />
        </div>
      </div>
    </CustomThemeProvider>
  );
};

export default Events;
