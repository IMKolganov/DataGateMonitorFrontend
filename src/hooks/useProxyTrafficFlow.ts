import { useEffect, useMemo, useRef, useState } from "react";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { ACCESS_TOKEN_REFRESHED_EVENT } from "../utils/auth/accessTokenEvents";
import { ACCESS_TOKEN_KEY } from "../utils/const";
import { errorMessage } from "../utils/errorMessage";
import { getProxyTrafficFlowHubUrl } from "../utils/signalrHubUrl";
import { getSignalRPreferredTransport } from "../utils/signalrTransport";

export type ProxyTrafficFlowState = "connected" | "disconnected" | "failed";
export type ProxyTrafficFlowProtocol = "tcp" | "udp" | "unknown";

export interface ProxyTrafficFlowUpdate {
  connectionId: string;
  protocol: ProxyTrafficFlowProtocol;
  state: ProxyTrafficFlowState;
  isConnected: boolean;
  isIdle: boolean;
  realClientIp?: string | null;
  realClientPort: number;
  clientRef?: string | null;
  userId?: string | null;
  username?: string | null;
  email?: string | null;
  localProxyIp?: string | null;
  localProxyPort: number;
  targetIp?: string | null;
  targetPort: number;
  clientToServerBytesTotal: number;
  serverToClientBytesTotal: number;
  clientToServerBytesDelta: number;
  serverToClientBytesDelta: number;
  connectedAtUtc: string;
  lastActivityAtUtc: string;
  emittedAtUtc: string;
  errorMessage?: string | null;
}

const STALE_FLOW_TTL_MS = 45_000;

function parseUtcMs(x: string): number {
  const ms = new Date(x).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function sameFlow(a: ProxyTrafficFlowUpdate, b: ProxyTrafficFlowUpdate): boolean {
  return (
    a.protocol === b.protocol &&
    a.state === b.state &&
    a.isConnected === b.isConnected &&
    a.isIdle === b.isIdle &&
    a.realClientIp === b.realClientIp &&
    a.realClientPort === b.realClientPort &&
    a.clientRef === b.clientRef &&
    a.userId === b.userId &&
    a.username === b.username &&
    a.email === b.email &&
    a.localProxyIp === b.localProxyIp &&
    a.localProxyPort === b.localProxyPort &&
    a.targetIp === b.targetIp &&
    a.targetPort === b.targetPort &&
    a.clientToServerBytesTotal === b.clientToServerBytesTotal &&
    a.serverToClientBytesTotal === b.serverToClientBytesTotal &&
    a.clientToServerBytesDelta === b.clientToServerBytesDelta &&
    a.serverToClientBytesDelta === b.serverToClientBytesDelta &&
    a.connectedAtUtc === b.connectedAtUtc &&
    a.lastActivityAtUtc === b.lastActivityAtUtc &&
    a.emittedAtUtc === b.emittedAtUtc &&
    a.errorMessage === b.errorMessage
  );
}

function parseIntSafe(x: unknown): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function asStringOrNull(x: unknown): string | null {
  return typeof x === "string" && x.length > 0 ? x : null;
}

function toProtocol(x: unknown): ProxyTrafficFlowProtocol {
  if (typeof x === "number") {
    if (x === 0) return "tcp";
    if (x === 1) return "udp";
    return "unknown";
  }
  if (typeof x === "string") {
    const s = x.trim().toLowerCase();
    if (s === "tcp") return "tcp";
    if (s === "udp") return "udp";
  }
  return "unknown";
}

function toState(x: unknown): ProxyTrafficFlowState {
  if (typeof x !== "string") return "connected";
  const s = x.trim().toLowerCase();
  if (s === "failed") return "failed";
  if (s === "disconnected") return "disconnected";
  return "connected";
}

function pick<T = unknown>(obj: Record<string, unknown>, camel: string, pascal: string): T | undefined {
  return (obj[camel] ?? obj[pascal]) as T | undefined;
}

function parseBatch(raw: unknown): ProxyTrafficFlowUpdate[] {
  if (!Array.isArray(raw)) return [];
  const result: ProxyTrafficFlowUpdate[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const connectionId = asStringOrNull(pick(o, "connectionId", "ConnectionId"));
    if (!connectionId) continue;

    result.push({
      connectionId,
      protocol: toProtocol(pick(o, "protocol", "Protocol")),
      state: toState(pick(o, "state", "State")),
      isConnected: Boolean(pick(o, "isConnected", "IsConnected")),
      isIdle: Boolean(pick(o, "isIdle", "IsIdle")),
      realClientIp: asStringOrNull(pick(o, "realClientIp", "RealClientIp")),
      realClientPort: parseIntSafe(pick(o, "realClientPort", "RealClientPort")),
      clientRef: asStringOrNull(pick(o, "clientRef", "ClientRef")),
      userId: asStringOrNull(pick(o, "userId", "UserId")),
      username: asStringOrNull(pick(o, "username", "Username")),
      email: asStringOrNull(pick(o, "email", "Email")),
      localProxyIp: asStringOrNull(pick(o, "localProxyIp", "LocalProxyIp")),
      localProxyPort: parseIntSafe(pick(o, "localProxyPort", "LocalProxyPort")),
      targetIp: asStringOrNull(pick(o, "targetIp", "TargetIp")),
      targetPort: parseIntSafe(pick(o, "targetPort", "TargetPort")),
      clientToServerBytesTotal: parseIntSafe(pick(o, "clientToServerBytesTotal", "ClientToServerBytesTotal")),
      serverToClientBytesTotal: parseIntSafe(pick(o, "serverToClientBytesTotal", "ServerToClientBytesTotal")),
      clientToServerBytesDelta: parseIntSafe(pick(o, "clientToServerBytesDelta", "ClientToServerBytesDelta")),
      serverToClientBytesDelta: parseIntSafe(pick(o, "serverToClientBytesDelta", "ServerToClientBytesDelta")),
      connectedAtUtc: String(pick(o, "connectedAtUtc", "ConnectedAtUtc") ?? ""),
      lastActivityAtUtc: String(pick(o, "lastActivityAtUtc", "LastActivityAtUtc") ?? ""),
      emittedAtUtc: String(pick(o, "emittedAtUtc", "EmittedAtUtc") ?? ""),
      errorMessage: asStringOrNull(pick(o, "errorMessage", "ErrorMessage")),
    });
  }

  return result;
}

export function useProxyTrafficFlow(enabled: boolean, hubOrigin?: string | null) {
  const [connectionState, setConnectionState] = useState("init");
  const [lastError, setLastError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [snapshot, setSnapshot] = useState<Record<string, ProxyTrafficFlowUpdate>>({});
  const connRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    const bump = () => setSessionKey((v) => v + 1);
    window.addEventListener(ACCESS_TOKEN_REFRESHED_EVENT, bump);
    return () => window.removeEventListener(ACCESS_TOKEN_REFRESHED_EVENT, bump);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setConnectionState("disabled");
      setLastError(null);
      setSnapshot({});
      const current = connRef.current;
      connRef.current = null;
      if (current) void current.stop();
      return;
    }

    let alive = true;
    const run = async () => {
      try {
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (!token) {
          setConnectionState("no-token");
          setLastError("No token in localStorage");
          return;
        }

        const conn = new HubConnectionBuilder()
          .withUrl(getProxyTrafficFlowHubUrl(hubOrigin), {
            accessTokenFactory: () => localStorage.getItem(ACCESS_TOKEN_KEY) ?? "",
            transport: getSignalRPreferredTransport(),
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000])
          .configureLogging(import.meta.env.DEV ? LogLevel.None : LogLevel.Information)
          .build();

        connRef.current = conn;

        conn.on("TrafficFlowUpdated", (payload: unknown) => {
          const entries = parseBatch(payload);
          if (!alive || entries.length === 0) return;

          setSnapshot((prev) => {
            let next: Record<string, ProxyTrafficFlowUpdate> | null = null;
            const ensureNext = () => {
              if (!next) next = { ...prev };
              return next;
            };

            const nowMs = Date.now();
            for (const [id, existing] of Object.entries(prev)) {
              const emittedAtMs = parseUtcMs(existing.emittedAtUtc);
              if (emittedAtMs > 0 && nowMs - emittedAtMs > STALE_FLOW_TTL_MS) {
                delete ensureNext()[id];
              }
            }

            for (const e of entries) {
              if (!e.isConnected && (e.state === "disconnected" || e.state === "failed")) {
                if (prev[e.connectionId]) delete ensureNext()[e.connectionId];
                continue;
              }

              const current = prev[e.connectionId];
              if (current && sameFlow(current, e)) continue;
              ensureNext()[e.connectionId] = e;
            }

            return next ?? prev;
          });
        });

        conn.onclose((err) => {
          if (!alive) return;
          setConnectionState("closed");
          setLastError(err ? String(err) : null);
        });

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

        setConnectionState("starting");
        await conn.start();

        if (!alive) return;
        setConnectionState("connected");
        setLastError(null);
      } catch (e: unknown) {
        if (!alive) return;
        setConnectionState("error");
        setLastError(errorMessage(e));
      }
    };

    void run();

    return () => {
      alive = false;
      const current = connRef.current;
      connRef.current = null;
      if (current) {
        current.stop().catch(() => {
          /* ignore */
        });
      }
    };
  }, [enabled, sessionKey, hubOrigin]);

  const flows = useMemo(() => Object.values(snapshot), [snapshot]);

  return { flows, connectionState, lastError };
}
