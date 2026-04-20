import { useEffect, useRef, useState } from "react";
import { ACCESS_TOKEN_REFRESHED_EVENT } from "../utils/auth/accessTokenEvents.ts";
import {
    HubConnection,
    HubConnectionBuilder,
    LogLevel,
} from "@microsoft/signalr";
import { postApiOpenVpnServersRunNow } from "../api/orval/vpn-servers/vpn-servers";
import type { ServiceStatusDto } from "../api/orval/model";
import { ServiceStatus as ServiceStatusEnum } from "../api/orval/model";
import {ACCESS_TOKEN_KEY} from "../utils/const.ts";
import { errorMessage } from "../utils/errorMessage.ts";
import { getStatusStreamHubUrl } from "../utils/signalrHubUrl.ts";
import { getSignalRPreferredTransport } from "../utils/signalrTransport.ts";

const MIN_ISO = /^0001-01-01T00:00:00/i;

function isValidIso(x?: string): boolean {
    if (!x || MIN_ISO.test(x)) return false;
    const ms = new Date(x).getTime();
    return Number.isFinite(ms);
}

// Accepts: array / record / { key,value } / { ServiceStatus: {...} }
function toDtos(raw: unknown): ServiceStatusDto[] {
    const arr: unknown[] = Array.isArray(raw)
        ? raw
        : Object.values(raw !== null && typeof raw === "object" ? raw : {});
    const result: ServiceStatusDto[] = [];

    for (const item of arr) {
        const maybePair = item && typeof item === "object" && ("value" in item || "Value" in item);
        const pair = item as { value?: unknown; Value?: unknown };
        const core = maybePair ? (pair.value ?? pair.Value) : item;
        const coreObj =
            core !== null && typeof core === "object" ? (core as Record<string, unknown>) : null;
        const leafRaw = coreObj?.["serviceStatus"] ?? coreObj?.["ServiceStatus"] ?? coreObj?.["servicestatus"] ?? core;
        const leaf =
            leafRaw !== null && typeof leafRaw === "object" ? (leafRaw as Record<string, unknown>) : null;

        if (!leaf) continue;

        const vpnServerId = Number(leaf["VpnServerId"] ?? leaf["vpnServerId"] ?? 0);
        const rawStatus = leaf["Status"] ?? leaf["status"];
        /** Hub JSON often omits default enum value (Idle = 0); treat as Idle. */
        const status =
            rawStatus === undefined || rawStatus === null ? ServiceStatusEnum.NUMBER_0 : rawStatus;

        const nrt = leaf["NextRunTime"] ?? leaf["nextRunTime"];
        const nextRunTime = isValidIso(typeof nrt === "string" ? nrt : undefined)
            ? String(nrt)
            : "N/A";

        const ccc = leaf["CountConnectedClients"] ?? leaf["countConnectedClients"];
        const cs = leaf["CountSessions"] ?? leaf["countSessions"];
        const tbi = leaf["TotalBytesIn"] ?? leaf["totalBytesIn"];
        const tbo = leaf["TotalBytesOut"] ?? leaf["totalBytesOut"];
        const onlineRaw = leaf["IsOnline"] ?? leaf["isOnline"];

        result.push({
            vpnServerId,
            status,
            errorMessage: (leaf["ErrorMessage"] ?? leaf["errorMessage"] ?? null) as string | null,
            nextRunTime,
            countConnectedClients: Number.isFinite(Number(ccc)) ? Number(ccc) : undefined,
            countSessions: Number.isFinite(Number(cs)) ? Number(cs) : undefined,
            totalBytesIn: Number.isFinite(Number(tbi)) ? Number(tbi) : undefined,
            totalBytesOut: Number.isFinite(Number(tbo)) ? Number(tbo) : undefined,
            ...(typeof onlineRaw === "boolean" ? { isOnline: onlineRaw } : {}),
        } as ServiceStatusDto);
    }

    return result;
}

export default function useSignalRService() {
    const [serviceData, setServiceData] = useState<Record<number, ServiceStatusDto>>({});
    const [connectionState, setConnectionState] = useState<string>("init");
    const [lastError, setLastError] = useState<string | null>(null);
    /** Bumps when access token is refreshed so the hub reconnects with a new JWT. */
    const [hubSessionKey, setHubSessionKey] = useState(0);

    const connRef = useRef<HubConnection | null>(null);

    useEffect(() => {
        const bumpHub = () => setHubSessionKey((k) => k + 1);
        window.addEventListener(ACCESS_TOKEN_REFRESHED_EVENT, bumpHub);
        return () => window.removeEventListener(ACCESS_TOKEN_REFRESHED_EVENT, bumpHub);
    }, []);

    useEffect(() => {
        let alive = true;

        const start = async () => {
            try {
                const token = localStorage.getItem(ACCESS_TOKEN_KEY);
                if (!token) {
                    setConnectionState("no-token");
                    setLastError("No token in localStorage");
                    return;
                }

                const hubUrl = getStatusStreamHubUrl();
                const primaryTransport = getSignalRPreferredTransport();
                const forceLp =
                    String(import.meta.env.VITE_SIGNALR_LONG_POLLING_ONLY ?? "").trim() === "1";
                const preferLp =
                    String(import.meta.env.VITE_SIGNALR_PREFER_LONG_POLLING ?? "").trim() === "1";
                const skipWebSockets =
                    String(import.meta.env.VITE_SIGNALR_SKIP_WEBSOCKETS ?? "").trim() === "1";

                if (import.meta.env.DEV) {
                    console.info("[SignalR status-stream] connecting to", hubUrl, {
                        primaryTransport,
                        forceLp,
                        preferLp,
                        skipWebSockets,
                    });
                }

                const conn = new HubConnectionBuilder()
                    .withUrl(hubUrl, {
                        accessTokenFactory: () => localStorage.getItem(ACCESS_TOKEN_KEY) ?? "",
                        transport: primaryTransport,
                    })
                    .withAutomaticReconnect([0, 2000, 5000, 10000])
                    .configureLogging(import.meta.env.DEV ? LogLevel.None : LogLevel.Information)
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
                });

                conn.on("StatusUpdated", (payload: unknown) => {
                    const p =
                        payload !== null && typeof payload === "object"
                            ? (payload as Record<string, unknown>)
                            : null;
                    const dtos = toDtos(p?.["statuses"] ?? p?.["Statuses"] ?? payload);

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
            } catch (e: unknown) {
                if (!alive) return;
                setConnectionState("error");
                const msg = e ? errorMessage(e) : "Unknown error";
                setLastError(msg);
                console.warn(
                    "[SignalR status-stream] connect failed — hub / negotiate / sticky sessions / scale-out backplane on API; optional .env: VITE_SIGNALR_SKIP_WEBSOCKETS=1, VITE_SIGNALR_PREFER_LONG_POLLING=1",
                    e,
                );
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
    }, [hubSessionKey]);

    const runServiceNow = async () => {
        await postApiOpenVpnServersRunNow();
    };

    return { serviceData, runServiceNow, connectionState, lastError };
}
