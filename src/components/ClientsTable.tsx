// src/components/ClientsTable.tsx
import React, { useCallback, useMemo, useState } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { formatBytes, formatDateWithOffset } from "../utils/utils";
import Grid from "./ui/TableStyle.tsx";
import CustomThemeProvider from "./ui/ThemeProvider.tsx";
import { Link, useParams } from "react-router-dom";
import type { VpnClientInfoDto } from "../api/orvalModelShim";
import "../css/Table.css";
import { UserAvatar } from "./ui/UserAvatar.tsx";
import { readOptionalAvatarUrl } from "../utils/readOptionalAvatarUrl.ts";
import { parseTelegramNumericId } from "../utils/telegramNumericId.ts";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors";
import { toast } from "react-toastify";
import { FaBolt, FaBan } from "react-icons/fa";
import { usePostApiOpenVpnClientsKill } from "../api/orval/vpn-server-clients/vpn-server-clients";
import {
  usePostApiVpnServersVpnServerIdXrayDisableUser,
  usePostApiVpnServersVpnServerIdXrayKickUser,
} from "../api/orval/vpn-server-xray-node/vpn-server-xray-node";
import { unwrapKillResponse } from "../utils/unwrapKillResponse";
import { errorMessage } from "../utils/errorMessage";
import { GridRowActions, RowActionButton } from "./ui/GridRowActions.tsx";

type ClientDto = VpnClientInfoDto;

/** Backend may add `userId` before OpenAPI/orval is updated. */
function pickClientUserId(client: object): string {
    const v = (client as Record<string, unknown>)["userId"];
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    if (typeof v === "string" && /^\d+$/.test(v.trim())) return v.trim();
    return "";
}

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
    /** Called after a row action (Xray kick/revoke, OpenVPN kill) succeeds so the parent can refetch. */
    onClientsChanged?: () => void;
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
                                                       onClientsChanged,
                                                   }) => {
    const { vpnServerId } = useParams<{ vpnServerId?: string }>();
    const [actionBusyKey, setActionBusyKey] = useState<string | null>(null);
    const canXrayAdminActions = clientsStack === "xray" && isAdmin(getCurrentUser());
    const canOpenVpnAdminActions = clientsStack === "openvpn" && isAdmin(getCurrentUser());
    const canLinkToUserStats = isAdmin(getCurrentUser());
    const serverIdForActions =
        typeof vpnServerIdProp === "number" && Number.isFinite(vpnServerIdProp)
            ? vpnServerIdProp
            : vpnServerId
              ? Number(vpnServerId)
              : undefined;

    const killMutation = usePostApiOpenVpnClientsKill();
    const xrayKickMutation = usePostApiVpnServersVpnServerIdXrayKickUser();
    const xrayDisableMutation = usePostApiVpnServersVpnServerIdXrayDisableUser();
    const handleOpenVpnKill = useCallback(
        async (commonName: string, revoke: boolean) => {
            if (!serverIdForActions || serverIdForActions <= 0 || !commonName) return;
            const key = `${revoke ? "kill-revoke" : "kill"}:${commonName}`;
            setActionBusyKey(key);
            try {
                const resp = await killMutation.mutateAsync({
                    data: {
                        vpnServerId: serverIdForActions,
                        commonName,
                        revokeCertificate: revoke,
                    },
                });
                const result = unwrapKillResponse(resp);
                if (result && result.success === false) {
                    toast.error(result.errorMessage ?? "Kill request failed.");
                } else {
                    toast.success(revoke ? "Client killed and certificate revoked." : "Client killed.");
                    onClientsChanged?.();
                }
            } catch (e) {
                toast.error(errorMessage(e));
            } finally {
                setActionBusyKey(null);
            }
        },
        [serverIdForActions, killMutation, onClientsChanged]
    );

    const postXrayAction = useCallback(
        async (action: "kick-user" | "disable-user", commonName: string) => {
            if (!serverIdForActions || serverIdForActions <= 0) return;
            const key = `${action}:${commonName}`;
            setActionBusyKey(key);
            try {
                const payload = { vpnServerId: serverIdForActions, data: { commonName } };
                if (action === "kick-user") {
                    await xrayKickMutation.mutateAsync(payload);
                } else {
                    await xrayDisableMutation.mutateAsync(payload);
                }
                toast.success(
                    action === "kick-user"
                        ? "Session dropped; client can reconnect."
                        : "Client revoked on node.",
                );
                onClientsChanged?.();
            } catch (e) {
                toast.error(errorMessage(e));
            } finally {
                setActionBusyKey(null);
            }
        },
        [serverIdForActions, onClientsChanged, xrayKickMutation, xrayDisableMutation],
    );

    const rows = clients.map((client, index) => {
        const rowId = client.id ?? page * pageSize + index + 1;
        const externalId = client.externalId ?? "";
        const displayName = client.displayName ?? "";
        const commonName = client.commonName ?? "";
        const userId = pickClientUserId(client as object);
        return {
            id: rowId,
            commonName,
            externalId,
            displayName,
            displayNameForAvatar: displayName || commonName || externalId || "Client",
            avatarUrl: readOptionalAvatarUrl(client as object),
            telegramPhotoTelegramId: parseTelegramNumericId(externalId || undefined),
            avatarColorSeed: [userId && `u:${userId}`, externalId, displayName, commonName, String(rowId)]
                .filter(Boolean)
                .join("|"),
            remoteIp: client.remoteIp ?? "",
            proxyRealIp: client.proxyRealIp?.trim() || "—",
            localIp: client.localIp ?? "",
            bytesReceived: formatBytes(client.bytesReceived ?? 0),
            bytesSent: formatBytes(client.bytesSent ?? 0),
            connectedSince: client.connectedSince
                ? formatDateWithOffset(new Date(client.connectedSince))
                : "",
            country: [client.country, client.region, client.city].filter(Boolean).join(", "),
            _cn: commonName,
        };
    });

    const columns: GridColDef[] = useMemo(() => {
        const base: GridColDef[] = [
        {
            field: "avatar",
            headerName: "",
            width: 56,
            sortable: false,
            disableColumnMenu: true,
            renderCell: (params) => (
                <UserAvatar
                    src={params.row.avatarUrl as string | undefined}
                    telegramPhotoTelegramId={params.row.telegramPhotoTelegramId as number | undefined}
                    name={params.row.displayNameForAvatar as string}
                    colorSeed={params.row.avatarColorSeed as string}
                    size={28}
                />
            ),
        },
        { field: "id", headerName: "ID", width: 70 },
        { field: "commonName", headerName: "Common Name", flex: 0.7 },
        {
            field: "externalId",
            headerName: "External Id",
            flex: 0.5,
            renderCell: (params) => {
                const val = params.value as string | undefined;
                if (!val) return null;

                if (!canLinkToUserStats) {
                    return <span>{val}</span>;
                }

                const url = vpnServerId
                    ? `/servers/${vpnServerId}/statistics/${encodeURIComponent(val)}`
                    : `/servers/statistics/${encodeURIComponent(val)}`;

                return (
                    <Link to={url} className="link-accent">
                        {val}
                    </Link>
                );
            },
        },
        { field: "displayName", headerName: "Display Name", flex: 0.6 },
        { field: "remoteIp", headerName: "Remote Address", flex: 0.6 },
        {
            field: "proxyRealIp",
            headerName: "Real Client IP",
            flex: 0.6,
            description:
                "Public client endpoint resolved via WSS proxy lookup (OpenVPN management shows loopback in Remote Address).",
        },
        { field: "localIp", headerName: "Local Address", flex: 0.5 },
        { field: "bytesReceived", headerName: "Bytes Received", flex: 0.4 },
        { field: "bytesSent", headerName: "Bytes Sent", flex: 0.4 },
        { field: "connectedSince", headerName: "Connected Since", flex: 0.5 },
        { field: "country", headerName: "Country", flex: 1 },
        ];
        if (canXrayAdminActions) {
            return [
                ...base,
                {
                    field: "xrayActions",
                    headerName: "Actions",
                    sortable: false,
                    filterable: false,
                    width: 110,
                    renderCell: (params) => {
                        const cn = (params.row as { _cn?: string })._cn ?? "";
                        if (!cn) return null;
                        const busyKick = actionBusyKey === `kick-user:${cn}`;
                        const busyDisable = actionBusyKey === `disable-user:${cn}`;
                        return (
                            <GridRowActions>
                                <RowActionButton
                                    disabled={busyKick || busyDisable}
                                    title={
                                        busyKick
                                            ? "Dropping session…"
                                            : "Drop active sessions; client stays issued and can reconnect."
                                    }
                                    onClick={() => void postXrayAction("kick-user", cn)}
                                    icon={<FaBolt className="icon" aria-hidden />}
                                />
                                <RowActionButton
                                    variant="danger"
                                    disabled={busyKick || busyDisable}
                                    title={
                                        busyDisable
                                            ? "Revoking…"
                                            : "Revoke client on this node (same as revoking an issued link)."
                                    }
                                    onClick={() => {
                                        if (
                                            !window.confirm(
                                                `Revoke Xray client "${cn}" on this server? Their profile will stop working; issue a new link if needed.`
                                            )
                                        )
                                            return;
                                        void postXrayAction("disable-user", cn);
                                    }}
                                    icon={<FaBan className="icon" aria-hidden />}
                                />
                            </GridRowActions>
                        );
                    },
                } satisfies GridColDef,
            ];
        }
        if (canOpenVpnAdminActions) {
            return [
                ...base,
                {
                    field: "openVpnActions",
                    headerName: "Actions",
                    sortable: false,
                    filterable: false,
                    width: 110,
                    renderCell: (params) => {
                        const cn = (params.row as { _cn?: string })._cn ?? "";
                        if (!cn) return null;
                        const busyKill = actionBusyKey === `kill:${cn}`;
                        const busyKillRevoke = actionBusyKey === `kill-revoke:${cn}`;
                        return (
                            <GridRowActions>
                                <RowActionButton
                                    disabled={busyKill || busyKillRevoke}
                                    title={
                                        busyKill
                                            ? "Disconnecting…"
                                            : "Disconnect the active OpenVPN session; the client can reconnect."
                                    }
                                    onClick={() => void handleOpenVpnKill(cn, false)}
                                    icon={<FaBolt className="icon" aria-hidden />}
                                />
                                <RowActionButton
                                    variant="danger"
                                    disabled={busyKill || busyKillRevoke}
                                    title={
                                        busyKillRevoke
                                            ? "Killing and revoking…"
                                            : "Disconnect and revoke the OVPN certificate; the client cannot reconnect with this profile."
                                    }
                                    onClick={() => {
                                        if (
                                            !window.confirm(
                                                `Kill and revoke the OVPN certificate for "${cn}"? They will need a new profile to reconnect.`
                                            )
                                        )
                                            return;
                                        void handleOpenVpnKill(cn, true);
                                    }}
                                    icon={<FaBan className="icon" aria-hidden />}
                                />
                            </GridRowActions>
                        );
                    },
                } satisfies GridColDef,
            ];
        }
        return base;
    }, [canLinkToUserStats, canXrayAdminActions, canOpenVpnAdminActions, actionBusyKey, postXrayAction, handleOpenVpnKill, vpnServerId]);

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
                <Grid
                    gridId="vpn-clients"
                    rows={rows}
                    columns={columns}
                    autoHeight
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
