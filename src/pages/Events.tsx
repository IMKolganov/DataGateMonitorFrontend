// src/pages/Events.tsx
import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import StyledDataGrid from "../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../components/ui/ThemeProvider.tsx";
import type { GridColDef } from "@mui/x-data-grid";
import { FaBolt, FaInfoCircle, FaSync } from "react-icons/fa";
import { formatDateWithOffset } from "../utils/utils";
import "../css/Table.css";
import "../css/Settings.css";
import "../css/ServerDetails.css";
import {
  useGetApiOpenVpnEventsGetByServer,
  getApiOpenVpnEventsGetByServer,
} from "../api/orval/vpn-server-event/vpn-server-event";
import { useGetApiOpenVpnServersGetVpnServerId } from "../api/orval/vpn-servers/vpn-servers";
import type { VpnServerResponse } from "../api/orvalModelShim";
import { isOpenVpnStack } from "../constants/vpnServerType";
import { OpenVpnServerFeaturePlaceholder } from "../components/servers/OpenVpnServerFeaturePlaceholder";
import { ServerAccessDenied } from "../components/ServerAccessDenied";
import { usePersistedPageSize } from "../hooks/usePersistedPageSize";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors";
import type { VpnServerEventLogDto } from "../api/orvalModelShim";

// Resp is already unwrapped by ogmMutator (ApiResponse<T> -> T)
type Resp = Awaited<ReturnType<typeof getApiOpenVpnEventsGetByServer>>;
type Item = VpnServerEventLogDto;

type Normalized<TItem> = {
  items: TItem[];
  totalCount: number;
  page?: number;
  pageSize?: number;
};

// --- Safe formatters ---
const safeFormatDate = (value: unknown) => {
  if (!value || (typeof value !== "string" && typeof value !== "number")) return "";
  const date = new Date(value);
  return isNaN(date.getTime()) ? "" : formatDateWithOffset(date);
};

const formatBytes = (n?: number | null) => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
};

const formatDuration = (s?: number | null) => {
  if (s === null || s === undefined || !Number.isFinite(s)) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const pad = (x: number) => x.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

// Normalize different possible response shapes into a stable struct
function normalize<TItem = Item>(raw: Resp): Normalized<TItem> {
  const rawU: unknown = raw ?? {};
  const events: unknown = Array.isArray(rawU)
    ? rawU
    : (rawU as Record<string, unknown>)["events"] ?? rawU;

  const topRec =
    !Array.isArray(rawU) && rawU !== null && typeof rawU === "object"
      ? (rawU as Record<string, unknown>)
      : null;

  const items: unknown[] = (() => {
    if (events !== null && typeof events === "object" && !Array.isArray(events)) {
      const ev = events as Record<string, unknown>;
      if (Array.isArray(ev["items"])) return ev["items"] as unknown[];
    }
    if (Array.isArray(events)) return events;
    if (topRec && Array.isArray(topRec["items"])) return topRec["items"] as unknown[];
    if (Array.isArray(rawU)) return rawU;
    return [];
  })();

  const evRec =
    events !== null && typeof events === "object" && !Array.isArray(events)
      ? (events as Record<string, unknown>)
      : null;

  const totalCount: number =
    (typeof evRec?.["totalCount"] === "number" ? evRec["totalCount"] : undefined) ??
    (typeof topRec?.["totalCount"] === "number" ? topRec["totalCount"] : undefined) ??
    items.length;

  const page: number | undefined =
    typeof evRec?.["page"] === "number"
      ? evRec["page"]
      : typeof topRec?.["page"] === "number"
        ? topRec["page"]
        : undefined;

  const pageSize: number | undefined =
    typeof evRec?.["pageSize"] === "number"
      ? evRec["pageSize"]
      : typeof topRec?.["pageSize"] === "number"
        ? topRec["pageSize"]
        : undefined;

  return { items: items as TItem[], totalCount, page, pageSize };
}

const Events: React.FC = () => {
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();
  const numericServerId = Number(vpnServerId || 0);
  const canViewEvents = isAdmin(getCurrentUser());

  const serverQuery = useGetApiOpenVpnServersGetVpnServerId(numericServerId, {
    query: {
      enabled: numericServerId > 0,
      staleTime: 10_000,
      retry: 1,
    },
  });
  const serverPayload = serverQuery.data as VpnServerResponse | undefined;
  const eventsApiEnabled =
    numericServerId > 0 &&
    serverQuery.isSuccess &&
    isOpenVpnStack(serverPayload?.vpnServer?.serverType);

  // Keep DataGrid model in URL-less state via React state lifted into grid (server pagination)
  const [page, setPage] = React.useState(0);       // DataGrid is 0-based
  const [pageSize, setPageSize] = usePersistedPageSize(
    `events:${vpnServerId ?? "0"}`,
    10,
    "5,10,20,50,100",
  );

  const params = useMemo(() => {
    return {
      // IMPORTANT: Orval params are PascalCase (as seen on other endpoints: From/To)
      VpnServerId: numericServerId,
      Page: page + 1,       // API is 1-based
      PageSize: pageSize,
    };
  }, [numericServerId, page, pageSize]);

  const {
    data: resp,
    isFetching,
    refetch,
  } = useGetApiOpenVpnEventsGetByServer<Resp>(params, {
    query: {
      enabled: eventsApiEnabled && canViewEvents,
      // v5 way to keep previous page data during refetch
      placeholderData: (prev) => prev as Resp,
      // optionally tune caching:
      // staleTime: 0,
      // gcTime: 5 * 60 * 1000,
    },
  });

  const normalized = useMemo(() => (resp ? normalize<Item>(resp) : { items: [], totalCount: 0 } as Normalized<Item>), [resp]);

  const [paginationSyncKey, setPaginationSyncKey] = useState<unknown>(null);
  if (resp && resp !== paginationSyncKey) {
    setPaginationSyncKey(resp);
    const n = normalize<Item>(resp);
    if (typeof n.page === "number" && n.page >= 1) {
      const zero = n.page - 1;
      if (zero !== page) setPage(zero);
    }
    if (typeof n.pageSize === "number" && n.pageSize > 0 && n.pageSize !== pageSize) {
      setPageSize(n.pageSize);
    }
  }

  const rows = useMemo(() => {
    return normalized.items.map((e: Item, idx: number) => ({
      id: Number(e?.id ?? idx + 1),
      eventType: String(e?.eventType ?? ""),
      commonName: e?.commonName ?? "",
      realAddress: e?.realAddress ?? "",
      virtualAddress: e?.virtualAddress ?? "",
      connectedSince: safeFormatDate(e?.connectedSince),
      eventTimeUtc: safeFormatDate(e?.eventTimeUtc),
      disconnectedAt: safeFormatDate(e?.disconnectedAt),
      duration: formatDuration(
        typeof e?.durationSec === "number" ? e.durationSec : undefined
      ),
      bytesSent: formatBytes(
        typeof e?.bytesSent === "number" ? e.bytesSent : undefined
      ),
      bytesReceived: formatBytes(
        typeof e?.bytesReceived === "number" ? e.bytesReceived : undefined
      ),
      ivVer: e?.ivVer ?? "",
      // Uncomment if you want more columns:
      // ivGuiVer: e?.ivGuiVer ?? "",
      // ivPlat: e?.ivPlat ?? "",
      createDate: safeFormatDate(e?.createDate),
    }));
  }, [normalized.items]);

  if (!canViewEvents) {
    return (
      <div className="page-pad">
        <ServerAccessDenied
          title="Access restricted"
          message="Server event logs are available to administrators only."
        />
      </div>
    );
  }

  if (
    numericServerId > 0 &&
    serverQuery.isSuccess &&
    !isOpenVpnStack(serverPayload?.vpnServer?.serverType)
  ) {
    return (
      <OpenVpnServerFeaturePlaceholder vpnServerId={String(vpnServerId)} featureLabel="Events">
        <p className="form-hint--mt-8">
          OpenVPN management event logs are not produced for Xray (VLESS) nodes.
        </p>
      </OpenVpnServerFeaturePlaceholder>
    );
  }

  if (numericServerId > 0 && serverQuery.isPending) {
    return (
      <div className="server-details__panel panel-pad">
        <p>Loading server…</p>
      </div>
    );
  }

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "eventType", headerName: "Type", flex: 0.8 },
    { field: "commonName", headerName: "Common Name", flex: 1 },
    { field: "realAddress", headerName: "Real Address", flex: 0.9 },
    { field: "virtualAddress", headerName: "Virtual Address", flex: 0.8 },
    { field: "connectedSince", headerName: "Connected Since", flex: 1 },
    { field: "eventTimeUtc", headerName: "Event Time (UTC)", flex: 1 },
    { field: "disconnectedAt", headerName: "Disconnected At", flex: 1 },
    { field: "duration", headerName: "Duration", width: 120 },
    { field: "bytesSent", headerName: "Sent", width: 120 },
    { field: "bytesReceived", headerName: "Received", width: 120 },
    { field: "ivVer", headerName: "IV Ver", width: 120 },
    // { field: "ivGuiVer", headerName: "IV GUI Ver", flex: 1.2 },
    // { field: "ivPlat", headerName: "Platform", width: 120 },
    { field: "createDate", headerName: "Create Date", flex: 1 },
  ];

  return (
    <CustomThemeProvider>
      <div>
        <div className="header-bar">
          <div className="left-buttons">
            <button
              className="btn secondary"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <FaSync className={`icon ${isFetching ? "icon-spin" : ""}`} aria-hidden /> Refresh
            </button>
          </div>
        </div>

        <section className="server-details__panel" aria-labelledby="server-events-heading">
          <h2 id="server-events-heading" className="settings-page__h2-with-icon">
            <FaBolt className="icon" aria-hidden />
            <span>Server Events</span>
          </h2>

          <div className="data-grid-wrap data-grid-wrap--inset">
            <StyledDataGrid
              rows={rows}
              columns={columns}
              pageSizeOptions={[5, 10, 20, 50, 100]}
              paginationMode="server"
              rowCount={normalized.totalCount}
              paginationModel={{ page, pageSize }}
              onPaginationModelChange={(model) => {
                setPage(model.page);
                setPageSize(model.pageSize);
              }}
              loading={isFetching}
              slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
              localeText={{ noRowsLabel: "📭 No events logged" }}
            />
          </div>
        </section>

        <section className="events-page__about-card" aria-labelledby="server-events-about-heading">
          <h2 id="server-events-about-heading" className="events-page__about-title">
            <FaInfoCircle className="icon" aria-hidden />
            <span>About Server Events</span>
          </h2>
          <div className="events-page__about-body">
            <p>
              This dashboard displays real-time OpenVPN server events triggered by hook scripts configured in the
              server’s configuration file. These events are emitted when the VPN server processes a client connection,
              disconnect, address assignment, or TLS verification.
            </p>

            <p>
              <strong>Scripts responsible for event generation and when they fire:</strong>
            </p>
            <ul>
              <li>
                <strong>client-connect.sh</strong> — executed when a client has successfully completed
                login/authentication and a virtual tunnel is about to be set up. (
                <a
                  href="https://community.openvpn.net/openvpn/wiki/ClientConnectDisconnect#clientconnect"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-accent--inline"
                >
                  ClientConnect/ClientDisconnect documentation
                </a>
                )
              </li>
              <li>
                <strong>client-disconnect.sh</strong> — executed when a client disconnects, either voluntarily or on
                timeout. (
                <a
                  href="https://community.openvpn.net/openvpn/wiki/ClientConnectDisconnect#clientdisconnect"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-accent--inline"
                >
                  ClientConnect/ClientDisconnect documentation
                </a>
                )
              </li>
              <li>
                <strong>learn-address.sh</strong> — executed when OpenVPN adds/removes or updates a client address in
                the routing table (e.g., after assignment of a VPN-address). (
                <a
                  href="https://github.com/OpenVPN/openvpn/blob/master/doc/man-sections/script-options.rst#learn-address"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-accent--inline"
                >
                  learn-address option documentation
                </a>
                )
              </li>
              <li>
                <strong>tls-verify.sh</strong> — executed after the TLS handshake, before full client connection is
                accepted (if configured). (
                <a
                  href="https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/#tls-verify"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-accent--inline"
                >
                  tls-verify option in reference manual
                </a>
                )
              </li>
              <li>
                <strong>log-authfail.sh</strong> — executed on authentication failure (client certificate or user/pass)
                when configured via auth-user-pass-verify or similar. (
                <a
                  href="https://engineering.freeagent.com/2017/05/22/external-authentication-scripts-in-openvpn-the-right-way/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-accent--inline"
                >
                  External authentication scripts article
                </a>
                )
              </li>
              <li>
                <strong>log-watcher.sh</strong> — a custom watcher script triggered by changes in log files or by other
                hooks (not a built-in OpenVPN hook, but commonly used for monitoring connection/disconnection logs).
              </li>
            </ul>

            <p>
              <strong>Why these scripts matter:</strong>
            </p>
            <p>
              They provide real-time events whenever clients connect, disconnect, are assigned addresses, or fail
              authentication. The backend consumes these scripts’ outputs (environment variables, arguments) and logs
              structured events (with fields like ID, Type, Common Name, IPs, Duration, Traffic). This dashboard uses
              that logged data to display a detailed view of client activity.
            </p>

            <p>
              The data is collected automatically via scripts configured on the VPN server. On each relevant hook the
              script logs required metadata, the backend processes it, and this dashboard fetches the records via the API
              endpoint to provide a full overview of VPN client activity.
            </p>
          </div>
        </section>
      </div>
    </CustomThemeProvider>
  );
};

export default Events;
