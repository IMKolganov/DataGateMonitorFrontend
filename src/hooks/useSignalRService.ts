import { useEffect, useRef, useState } from "react";
import {
    HubConnection,
    HubConnectionBuilder,
    HttpTransportType,
    LogLevel,
} from "@microsoft/signalr";
import { postApiOpenVpnServersRunNow } from "../api/orval/open-vpn-servers/open-vpn-servers";
import type { ServiceStatusDto } from "../api/orval/model";

const MIN_ISO = /^0001-01-01T00:00:00/i;

function isValidIso(x?: string): boolean {
    if (!x || MIN_ISO.test(x)) return false;
    const ms = new Date(x).getTime();
    return Number.isFinite(ms);
}

// Accepts: array / record / { key,value } / { ServiceStatus: {...} }
function toDtos(raw: any): ServiceStatusDto[] {
    const arr: any[] = Array.isArray(raw) ? raw : Object.values(raw ?? {});
    const result: ServiceStatusDto[] = [];

    for (const item of arr) {
        const maybePair = item && typeof item === "object" && ("value" in item || "Value" in item);
        const core = maybePair ? (item.value ?? item.Value) : item;
        const leaf = core?.serviceStatus ?? core?.ServiceStatus ?? core?.servicestatus ?? core;

        if (!leaf || typeof leaf !== "object") continue;

        const vpnServerId = Number(leaf.VpnServerId ?? leaf.vpnServerId ?? 0);
        const status = leaf.Status ?? leaf.status;

        const nextRunTime = isValidIso(leaf.NextRunTime ?? leaf.nextRunTime)
            ? String(leaf.NextRunTime ?? leaf.nextRunTime)
            : "N/A";

        result.push({
            vpnServerId,
            status,
            errorMessage: leaf.ErrorMessage ?? leaf.errorMessage ?? null,
            nextRunTime,
            countConnectedClients: Number.isFinite(Number(leaf.CountConnectedClients))
                ? Number(leaf.CountConnectedClients)
                : undefined,
            countSessions: Number.isFinite(Number(leaf.CountSessions))
                ? Number(leaf.CountSessions)
                : undefined,
            totalBytesIn: Number.isFinite(Number(leaf.TotalBytesIn)) ? Number(leaf.TotalBytesIn) : undefined,
            totalBytesOut: Number.isFinite(Number(leaf.TotalBytesOut)) ? Number(leaf.TotalBytesOut) : undefined,
        });
    }

    return result;
}

export default function useSignalRService() {
    const [serviceData, setServiceData] = useState<Record<number, ServiceStatusDto>>({});
    const [connectionState, setConnectionState] = useState<string>("init");
    const [lastError, setLastError] = useState<string | null>(null);

    const connRef = useRef<HubConnection | null>(null);

    useEffect(() => {
        let alive = true;

        const start = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    setConnectionState("no-token");
                    setLastError("No token in localStorage");
                    return;
                }

                // IMPORTANT: Use relative URL so it works behind your /api proxy
                const hubUrl = "/api/hubs/status-stream";

                const conn = new HubConnectionBuilder()
                    .withUrl(hubUrl, {
                        accessTokenFactory: () => localStorage.getItem("token") ?? "",
                        transport: HttpTransportType.WebSockets,
                    })
                    .withAutomaticReconnect([0, 2000, 5000, 10000])
                    .configureLogging(LogLevel.Information)
                    .build();

                connRef.current = conn;

                conn.onreconnecting((err) => {
                    if (!alive) return;
                    setConnectionState("reconnecting");
                    setLastError(err ? String(err) : null);
                });

                conn.onreconnected(() => {
                    if (!alive) return;
                    setConnectionState("connected");
                    setLastError(null);
                });

                conn.onclose((err) => {
                    if (!alive) return;
                    setConnectionState("closed");
                    setLastError(err ? String(err) : null);
                    console.warn("[SignalR] closed", err);
                });

                // IMPORTANT: This name must match server SendAsync("StatusUpdated", ...)
                conn.on("StatusUpdated", (payload: any) => {
                    const dtos = toDtos(payload?.statuses ?? payload?.Statuses ?? payload);

                    if (!alive || dtos.length === 0) return;

                    const patch: Record<number, ServiceStatusDto> = {};
                    for (const d of dtos) {
                        const id = Number(d.vpnServerId ?? 0);
                        if (!Number.isFinite(id) || id <= 0) continue;
                        patch[id] = d;
                    }

                    setServiceData((prev) => ({ ...prev, ...patch }));
                });

                setConnectionState("starting");

                await conn.start();

                if (!alive) return;

                setConnectionState("connected");
                setLastError(null);
            } catch (e: any) {
                if (!alive) return;
                setConnectionState("error");
                setLastError(e ? String(e?.message ?? e) : "Unknown error");
                console.error("[SignalR] start error", e);
            }
        };

        start();

        return () => {
            alive = false;
            const c = connRef.current;
            connRef.current = null;

            if (c) {
                c.stop().catch(() => {
                    /* ignore */
                });
            }
        };
    }, []);

    const runServiceNow = async () => {
        await postApiOpenVpnServersRunNow();
    };

    return { serviceData, runServiceNow, connectionState, lastError };
}
