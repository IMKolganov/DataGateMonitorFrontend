// src/components/ClientsTable.tsx
import React, { useCallback, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { formatBytes, formatDateWithOffset } from "../utils/utils";
import StyledDataGrid from "./ui/TableStyle.tsx";
import CustomThemeProvider from "./ui/ThemeProvider.tsx";
import { Link, useParams } from "react-router-dom";
import type { VpnClientInfoDto } from "../api/orvalModelShim";
import "../css/Table.css";
import { apiRequest } from "../api/apirequest";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors";
import { toast } from "react-toastify";
import { FaBolt, FaBan } from "react-icons/fa";

type ClientDto = VpnClientInfoDto;

interface ClientsTableProps {
    clients: ClientDto[];
    totalClients: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    loading: boolean;
    /** When set, empty grid / errors are explained for Xray polling instead of OpenVPN wording. */
    clientsStack?: "openvpn" | "xray";
    vpnServerId?: number;
    /** Last processor / node poll error persisted on the server row (optional). */
    xrayPollError?: string | null;
    /** React Query / HTTP failure while loading the clients list. */
    xrayQueryErrorMessage?: string | null;
    onXraySessionsChanged?: () => void;
}

const ClientsTable: React.FC<ClientsTableProps> = ({
                                                       clients,
                                                       totalClients,
                                                       page,
                                                       pageSize,
                                                       onPageChange,
                                                       onPageSizeChange,
                                                       loading,
                                                       clientsStack = "openvpn",
                                                       vpnServerId: vpnServerIdProp,
                                                       xrayPollError,
                                                       xrayQueryErrorMessage,
                                                       onXraySessionsChanged,
                                                   }) => {
    const { vpnServerId } = useParams<{ vpnServerId?: string }>();
    const [actionBusyKey, setActionBusyKey] = useState<string | null>(null);
    const canXrayAdminActions = clientsStack === "xray" && isAdmin(getCurrentUser());
    const serverIdForActions =
        typeof vpnServerIdProp === "number" && Number.isFinite(vpnServerIdProp)
            ? vpnServerIdProp
            : vpnServerId
              ? Number(vpnServerId)
              : undefined;

    const postXrayAction = useCallback(
        async (path: "kick-user" | "disable-user", commonName: string) => {
            if (!serverIdForActions || serverIdForActions <= 0) return;
            const key = `${path}:${commonName}`;
            setActionBusyKey(key);
            try {
                const resp = await apiRequest<{ ok?: boolean }>(
                    "post",
                    `/api/vpn-servers/${serverIdForActions}/xray/${path}`,
                    { data: { commonName } }
                );
                if (!resp.success) {
                    toast.error(resp.errorMessage ?? "Request failed");
                    return;
                }
                toast.success(path === "kick-user" ? "Session dropped; client can reconnect." : "Client revoked on node.");
                onXraySessionsChanged?.();
            } catch (e) {
                toast.error(e instanceof Error ? e.message : "Request failed");
            } finally {
                setActionBusyKey(null);
            }
        },
        [serverIdForActions, onXraySessionsChanged]
    );

    const rows = clients.map((client, index) => ({
        id: client.id ?? page * pageSize + index + 1,
        commonName: client.commonName ?? "",
        externalId: client.externalId ?? "",
        displayName: client.displayName ?? "",
        remoteIp: client.remoteIp ?? "",
        localIp: client.localIp ?? "",
        bytesReceived: formatBytes(client.bytesReceived ?? 0),
        bytesSent: formatBytes(client.bytesSent ?? 0),
        connectedSince: client.connectedSince
            ? formatDateWithOffset(new Date(client.connectedSince))
            : "",
        country: [client.country, client.region, client.city].filter(Boolean).join(", "),
        _cn: client.commonName ?? "",
    }));

    const columns: GridColDef[] = useMemo(() => {
        const base: GridColDef[] = [
        { field: "id", headerName: "ID", width: 70 },
        { field: "commonName", headerName: "Common Name", flex: 0.7 },
        {
            field: "externalId",
            headerName: "External Id",
            flex: 0.5,
            renderCell: (params) => {
                const val = params.value as string | undefined;
                if (!val) return null;

                const url = vpnServerId
                    ? `/servers/${vpnServerId}/statistics/${val}`
                    : `/servers/statistics/${val}`;

                return (
                    <Link to={url} style={{ color: "#58a6ff", textDecoration: "none" }}>
                        {val}
                    </Link>
                );
            },
        },
        { field: "displayName", headerName: "Display Name", flex: 0.6 },
        { field: "remoteIp", headerName: "Remote Address", flex: 0.6 },
        { field: "localIp", headerName: "Local Address", flex: 0.5 },
        { field: "bytesReceived", headerName: "Bytes Received", flex: 0.4 },
        { field: "bytesSent", headerName: "Bytes Sent", flex: 0.4 },
        { field: "connectedSince", headerName: "Connected Since", flex: 0.5 },
        { field: "country", headerName: "Country", flex: 1 },
        ];
        if (!canXrayAdminActions) return base;
        return [
            ...base,
            {
                field: "xrayActions",
                headerName: "Actions",
                sortable: false,
                filterable: false,
                width: 260,
                renderCell: (params) => {
                    const cn = (params.row as { _cn?: string })._cn ?? "";
                    if (!cn) return null;
                    const busyKick = actionBusyKey === `kick-user:${cn}`;
                    const busyDisable = actionBusyKey === `disable-user:${cn}`;
                    return (
                        <div className="action-container">
                            <button
                                type="button"
                                className="btn secondary"
                                disabled={busyKick || busyDisable}
                                title="Drop active sessions; client stays issued and can reconnect."
                                onClick={() => void postXrayAction("kick-user", cn)}
                            >
                                <FaBolt className="icon" aria-hidden />
                                {busyKick ? "…" : "Drop session"}
                            </button>
                            <button
                                type="button"
                                className="btn danger"
                                disabled={busyKick || busyDisable}
                                title="Revoke client on this node (same as revoking an issued link)."
                                onClick={() => {
                                    if (
                                        !window.confirm(
                                            `Revoke Xray client "${cn}" on this server? Their profile will stop working; issue a new link if needed.`
                                        )
                                    )
                                        return;
                                    void postXrayAction("disable-user", cn);
                                }}
                            >
                                <FaBan className="icon" aria-hidden />
                                {busyDisable ? "…" : "Revoke"}
                            </button>
                        </div>
                    );
                },
            } satisfies GridColDef,
        ];
    }, [canXrayAdminActions, actionBusyKey, postXrayAction, vpnServerId]);

    const noRowsLabel = useMemo(() => {
        if (clientsStack !== "xray") return "No connected clients";
        const parts: string[] = [];
        if (xrayQueryErrorMessage) parts.push(xrayQueryErrorMessage);
        if (xrayPollError) parts.push(xrayPollError);
        if (parts.length) return `Could not load sessions (${parts.join(" — ")})`;
        return "No connected clients";
    }, [clientsStack, xrayPollError, xrayQueryErrorMessage]);

    return (
        <CustomThemeProvider>
            <div
                className="data-grid-wrap"
                style={{
                    backgroundColor: "var(--bg-body)",
                    padding: "10px",
                    borderRadius: "8px",
                }}
            >
                <StyledDataGrid
                    rows={rows}
                    columns={columns}
                    pageSizeOptions={[5, 10, 20, 50, 100]}
                    paginationMode="server"
                    rowCount={totalClients}
                    paginationModel={{ page, pageSize }}
                    onPaginationModelChange={(model) => {
                        if (model.page !== page) onPageChange(model.page);
                        if (model.pageSize !== pageSize) onPageSizeChange(model.pageSize);
                    }}
                    loading={loading}
                    slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
                    localeText={{
                        noRowsLabel,
                    }}
                />
            </div>
        </CustomThemeProvider>
    );
};

export default ClientsTable;
