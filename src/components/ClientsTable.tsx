// src/components/ClientsTable.tsx
import React from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { formatBytes, formatDateWithOffset } from "../utils/utils";
import StyledDataGrid from "./ui/TableStyle.tsx";
import CustomThemeProvider from "./ui/ThemeProvider.tsx";
import { Link, useParams } from "react-router-dom";
import type { VpnClientInfoDto } from "../api/orval/model";

type ClientDto = VpnClientInfoDto;

interface ClientsTableProps {
    clients: ClientDto[];
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
    const { vpnServerId } = useParams<{ vpnServerId?: string }>();

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
    }));

    const columns: GridColDef[] = [
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
                    paginationModel={{ page, pageSize }}
                    onPaginationModelChange={(model) => {
                        if (model.page !== page) onPageChange(model.page);
                        if (model.pageSize !== pageSize) onPageSizeChange(model.pageSize);
                    }}
                    loading={loading}
                    disableColumnFilter
                    disableColumnMenu
                    localeText={{
                        noRowsLabel: "No connected clients",
                    }}
                />
            </div>
        </CustomThemeProvider>
    );
};

export default ClientsTable;
