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
  serverId?: number;
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
  const normalizeToArray = (value: unknown): unknown[] => {
    if (Array.isArray(value)) {
      // Some relays/proxies can wrap payload into one extra nesting level: [[{...}]].
      if (value.length === 1 && Array.isArray(value[0])) return value[0] as unknown[];
      return value;
    }
    if (value && typeof value === "object") {
      const r = value as Record<string, unknown>;
      if (Array.isArray(r.items)) return r.items;
      if (Array.isArray(r.flows)) return r.flows;
      if (Array.isArray(r.updates)) return r.updates;
      if (Array.isArray(r.data)) return r.data;
      if (Array.isArray(r.value)) return r.value;
    }
    return [];
  };

  const source = normalizeToArray(raw);
  if (!Array.isArray(source)) return [];
  const result: ProxyTrafficFlowUpdate[] = [];

  for (const item of source) {
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

export function useProxyTrafficFlow(enabled: boolean, serverId?: number | null) {
  const [connectionState, setConnectionState] = useState("init");
  const [lastError, setLastError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [snapshot, setSnapshot] = useState<Record<string, ProxyTrafficFlowUpdate>>({});
  const connRef = useRef<HubConnection | null>(null);
  const debugEnabled = useMemo(() => {
    try {
      return localStorage.getItem("trafficFlowDebug") === "1";
    } catch {
      return false;
    }
  }, []);

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
        if (!Number.isFinite(serverId)) {
          setConnectionState("no-server");
          setLastError("No valid serverId for traffic flow hub");
          return;
        }

        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (!token) {
          setConnectionState("no-token");
          setLastError("No token in localStorage");
          return;
        }

        const hubUrl = `${getProxyTrafficFlowHubUrl()}?serverId=${encodeURIComponent(String(serverId))}`;
        const conn = new HubConnectionBuilder()
          .withUrl(hubUrl, {
            accessTokenFactory: () => localStorage.getItem(ACCESS_TOKEN_KEY) ?? "",
            transport: getSignalRPreferredTransport(),
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000])
          .configureLogging(LogLevel.None)
          .build();

        connRef.current = conn;

        conn.on("TrafficFlowUpdated", (payload: unknown) => {
          const entries = parseBatch(payload);
          if (debugEnabled) {
            // eslint-disable-next-line no-console
            console.debug("[TrafficFlowDebug][single] TrafficFlowUpdated received", {
              serverId,
              rawType: Array.isArray(payload) ? "array" : typeof payload,
              entries: entries.length,
            });
          }
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

            for (const baseEntry of entries) {
              const e: ProxyTrafficFlowUpdate = { ...baseEntry, serverId: serverId ?? undefined };
              const key = `${serverId}:${e.connectionId}`;

              if (!e.isConnected && (e.state === "disconnected" || e.state === "failed")) {
                if (prev[key]) delete ensureNext()[key];
                continue;
              }

              const current = prev[key];
              if (current && sameFlow(current, e)) continue;
              ensureNext()[key] = e;
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
  }, [enabled, sessionKey, serverId, debugEnabled]);

  const flows = useMemo(() => Object.values(snapshot), [snapshot]);

  return { flows, connectionState, lastError };
}

export function useProxyTrafficFlowMany(enabled: boolean, serverIds: number[]) {
  const [connectionState, setConnectionState] = useState("init");
  const [lastError, setLastError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [snapshot, setSnapshot] = useState<Record<string, ProxyTrafficFlowUpdate>>({});
  const connsRef = useRef<Map<number, HubConnection>>(new Map());
  const debugEnabled = useMemo(() => {
    try {
      return localStorage.getItem("trafficFlowDebug") === "1";
    } catch {
      return false;
    }
  }, []);

  const stableServerIdsKey = useMemo(() => {
    return [...new Set(serverIds.filter((x) => Number.isFinite(x) && x > 0))]
      .sort((a, b) => a - b)
      .join(",");
  }, [serverIds]);

  const stableServerIds = useMemo(
    () =>
      stableServerIdsKey.length > 0
        ? stableServerIdsKey
            .split(",")
            .map((x) => Number.parseInt(x, 10))
            .filter((x) => Number.isFinite(x) && x > 0)
        : [],
    [stableServerIdsKey]
  );

  useEffect(() => {
    const bump = () => setSessionKey((v) => v + 1);
    window.addEventListener(ACCESS_TOKEN_REFRESHED_EVENT, bump);
    return () => window.removeEventListener(ACCESS_TOKEN_REFRESHED_EVENT, bump);
  }, []);

  useEffect(() => {
    const stopAll = async () => {
      const entries = [...connsRef.current.values()];
      connsRef.current.clear();
      await Promise.all(entries.map((c) => c.stop().catch(() => undefined)));
    };

    if (!enabled || stableServerIds.length === 0) {
      setConnectionState("disabled");
      setLastError(null);
      setSnapshot({});
      void stopAll();
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

        setConnectionState("starting");
        setLastError(null);

        const nowServerSet = new Set(stableServerIds);
        const staleConnections = [...connsRef.current.entries()].filter(([id]) => !nowServerSet.has(id));
        await Promise.all(
          staleConnections.map(async ([id, conn]) => {
            connsRef.current.delete(id);
            await conn.stop().catch(() => undefined);
          })
        );

        await Promise.all(
          stableServerIds.map(async (sid) => {
            if (connsRef.current.has(sid)) return;

            const hubUrl = `${getProxyTrafficFlowHubUrl()}?serverId=${encodeURIComponent(String(sid))}`;
            const conn = new HubConnectionBuilder()
              .withUrl(hubUrl, {
                accessTokenFactory: () => localStorage.getItem(ACCESS_TOKEN_KEY) ?? "",
                transport: getSignalRPreferredTransport(),
              })
              .withAutomaticReconnect([0, 2000, 5000, 10000])
              .configureLogging(LogLevel.None)
              .build();

            conn.on("TrafficFlowUpdated", (payload: unknown) => {
              const entries = parseBatch(payload).map((e) => ({ ...e, serverId: sid }));
              if (debugEnabled) {
                // eslint-disable-next-line no-console
                console.debug("[TrafficFlowDebug][many] TrafficFlowUpdated received", {
                  serverId: sid,
                  rawType: Array.isArray(payload) ? "array" : typeof payload,
                  entries: entries.length,
                });
              }
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
                  const key = `${sid}:${e.connectionId}`;
                  if (!e.isConnected && (e.state === "disconnected" || e.state === "failed")) {
                    if (prev[key]) delete ensureNext()[key];
                    continue;
                  }
                  const current = prev[key];
                  if (current && sameFlow(current, e)) continue;
                  ensureNext()[key] = e;
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

            await conn.start();
            connsRef.current.set(sid, conn);
          })
        );

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
      void stopAll();
    };
  }, [enabled, sessionKey, stableServerIdsKey, debugEnabled]);

  const flows = useMemo(() => Object.values(snapshot), [snapshot]);
  return { flows, connectionState, lastError };
}
