import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaSyncAlt, FaTrash } from "react-icons/fa";
import {
  deleteApiOpenVpnServersStatusStreamLogs,
  getApiOpenVpnServersStatusStreamLogs,
} from "../api/orval/vpn-servers/vpn-servers";
import type {
  ApiVpnServersResponsesStatusStreamLogsResponse,
  VpnServersResponsesStatusStreamLogEntryResponse,
  VpnServersResponsesStatusStreamLogsResponse,
} from "../api/orvalModelShim";
import "../css/StatusStreamLogs.css";

const STORAGE_KEY = "status-stream-logs:v2";
const INITIAL_FETCH_LIMIT = 300;
const INCREMENTAL_FETCH_LIMIT = 60;

type ParsedServiceStatus = {
  vpnServerId: number;
  status: number | null;
  nextRunTime: string | null;
  countConnectedClients: number | null;
  countSessions: number | null;
  errorMessage: string | null;
};

type ParsedLogPayload = {
  timestampUtc: string | null;
  statuses: ParsedServiceStatus[];
};

type OperationalMetrics = {
  totalServers?: number;
  disabledServers?: number;
  toPollServers?: number;
  processedServers?: number;
  successServers?: number;
  timeoutServers?: number;
  failedServers?: number;
  configuredMaxParallelism?: number;
  observedMaxParallelism?: number;
  processorCount?: number;
  maxServerDurationMs?: number;
  avgServerDurationMs?: number;
  inFlight?: number;
  managedThreadId?: number;
};

type ParsedOperationalLogPayload = {
  kind: "polling-event";
  eventType: string;
  level: string | null;
  message: string;
  serverId: number | null;
  serverName: string | null;
  apiUrl: string | null;
  durationMs: number | null;
  details: string | null;
  metrics: OperationalMetrics | null;
};

type EventHighlight = "error" | "ok" | "progress" | "neutral";

type SlowServerEntry = {
  serverId: number | null;
  serverName: string | null;
  durationMs: number;
  timestampUtc: string | null;
};

type SlowServerAggregate = {
  serverId: number | null;
  serverName: string | null;
  maxDurationMs: number;
  avgDurationMs: number;
  samples: number;
  lastDurationMs: number;
};

function normalizeLog(input: VpnServersResponsesStatusStreamLogEntryResponse): VpnServersResponsesStatusStreamLogEntryResponse | null {
  if (!input.payloadJson || typeof input.payloadJson !== "string") return null;
  if (!input.timestampUtc || typeof input.timestampUtc !== "string") return null;
  return {
    timestampUtc: input.timestampUtc,
    payloadJson: input.payloadJson,
    source: input.source ?? "unknown",
  };
}

function logKey(entry: VpnServersResponsesStatusStreamLogEntryResponse): string {
  return `${entry.timestampUtc ?? ""}|${entry.payloadJson ?? ""}`;
}

function loadStoredLogs(): VpnServersResponsesStatusStreamLogEntryResponse[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const normalized: VpnServersResponsesStatusStreamLogEntryResponse[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const n = normalizeLog(item as VpnServersResponsesStatusStreamLogEntryResponse);
      if (n) normalized.push(n);
    }
    return normalized;
  } catch {
    return [];
  }
}

function saveStoredLogs(logs: VpnServersResponsesStatusStreamLogEntryResponse[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function mergeLogs(
  existing: VpnServersResponsesStatusStreamLogEntryResponse[],
  incoming: VpnServersResponsesStatusStreamLogEntryResponse[],
): VpnServersResponsesStatusStreamLogEntryResponse[] {
  const map = new Map<string, VpnServersResponsesStatusStreamLogEntryResponse>();
  for (const item of existing) map.set(logKey(item), item);
  for (const item of incoming) map.set(logKey(item), item);
  return [...map.values()].sort(
    (a, b) => new Date(b.timestampUtc ?? "").getTime() - new Date(a.timestampUtc ?? "").getTime(),
  );
}

function prettyPayload(payloadJson: string): string {
  try {
    return JSON.stringify(JSON.parse(payloadJson), null, 2);
  } catch {
    return payloadJson;
  }
}

function parsePayload(payloadJson: string): ParsedLogPayload | null {
  try {
    const parsed = JSON.parse(payloadJson) as {
      timestampUtc?: unknown;
      statuses?: Array<{
        serviceStatus?: {
          vpnServerId?: unknown;
          status?: unknown;
          nextRunTime?: unknown;
          countConnectedClients?: unknown;
          countSessions?: unknown;
          errorMessage?: unknown;
        };
      }>;
    };

    const statuses = Array.isArray(parsed.statuses)
      ? parsed.statuses
          .map((item) => item?.serviceStatus)
          .filter((x): x is NonNullable<typeof x> => !!x)
          .map((s) => ({
            vpnServerId: Number(s.vpnServerId ?? 0),
            status: typeof s.status === "number" ? s.status : null,
            nextRunTime: typeof s.nextRunTime === "string" ? s.nextRunTime : null,
            countConnectedClients:
              typeof s.countConnectedClients === "number" ? s.countConnectedClients : null,
            countSessions: typeof s.countSessions === "number" ? s.countSessions : null,
            errorMessage: typeof s.errorMessage === "string" ? s.errorMessage : null,
          }))
      : [];

    return {
      timestampUtc: typeof parsed.timestampUtc === "string" ? parsed.timestampUtc : null,
      statuses,
    };
  } catch {
    return null;
  }
}

function parseOperationalPayload(payloadJson: string): ParsedOperationalLogPayload | null {
  try {
    const parsed = JSON.parse(payloadJson) as {
      kind?: unknown;
      eventType?: unknown;
      level?: unknown;
      message?: unknown;
      serverId?: unknown;
      serverName?: unknown;
      apiUrl?: unknown;
      durationMs?: unknown;
      details?: unknown;
      metrics?: unknown;
    };

    if (parsed.kind !== "polling-event") return null;
    if (typeof parsed.eventType !== "string") return null;
    if (typeof parsed.message !== "string") return null;

    const metricsRaw =
      parsed.metrics && typeof parsed.metrics === "object" ? (parsed.metrics as Record<string, unknown>) : null;

    return {
      kind: "polling-event",
      eventType: parsed.eventType,
      level: typeof parsed.level === "string" ? parsed.level : null,
      message: parsed.message,
      serverId: typeof parsed.serverId === "number" ? parsed.serverId : null,
      serverName: typeof parsed.serverName === "string" ? parsed.serverName : null,
      apiUrl: typeof parsed.apiUrl === "string" ? parsed.apiUrl : null,
      durationMs: typeof parsed.durationMs === "number" ? parsed.durationMs : null,
      details: typeof parsed.details === "string" ? parsed.details : null,
      metrics: metricsRaw
        ? {
            totalServers: typeof metricsRaw.totalServers === "number" ? metricsRaw.totalServers : undefined,
            disabledServers:
              typeof metricsRaw.disabledServers === "number" ? metricsRaw.disabledServers : undefined,
            toPollServers: typeof metricsRaw.toPollServers === "number" ? metricsRaw.toPollServers : undefined,
            processedServers:
              typeof metricsRaw.processedServers === "number" ? metricsRaw.processedServers : undefined,
            successServers: typeof metricsRaw.successServers === "number" ? metricsRaw.successServers : undefined,
            timeoutServers: typeof metricsRaw.timeoutServers === "number" ? metricsRaw.timeoutServers : undefined,
            failedServers: typeof metricsRaw.failedServers === "number" ? metricsRaw.failedServers : undefined,
            configuredMaxParallelism:
              typeof metricsRaw.configuredMaxParallelism === "number"
                ? metricsRaw.configuredMaxParallelism
                : undefined,
            observedMaxParallelism:
              typeof metricsRaw.observedMaxParallelism === "number"
                ? metricsRaw.observedMaxParallelism
                : undefined,
            processorCount: typeof metricsRaw.processorCount === "number" ? metricsRaw.processorCount : undefined,
            maxServerDurationMs:
              typeof metricsRaw.maxServerDurationMs === "number" ? metricsRaw.maxServerDurationMs : undefined,
            avgServerDurationMs:
              typeof metricsRaw.avgServerDurationMs === "number" ? metricsRaw.avgServerDurationMs : undefined,
            inFlight: typeof metricsRaw.inFlight === "number" ? metricsRaw.inFlight : undefined,
            managedThreadId:
              typeof metricsRaw.managedThreadId === "number" ? metricsRaw.managedThreadId : undefined,
          }
        : null,
    };
  } catch {
    return null;
  }
}

function statusLabel(status: number | null): string {
  if (status === 1) return "Running";
  if (status === 2) return "Error";
  if (status === 0) return "Idle";
  return "Unknown";
}

function getEventHighlight(eventType: string, level: string | null): EventHighlight {
  if (eventType === "server-error" || eventType === "server-timeout" || eventType === "cycle-failed") {
    return "error";
  }
  if (eventType === "server-success") return "ok";
  if (eventType === "server-start" || eventType === "cycle-start") return "progress";
  if ((level ?? "").toLowerCase() === "error") return "error";
  return "neutral";
}

function getHighlightLabel(highlight: EventHighlight): string {
  if (highlight === "error") return "ERROR";
  if (highlight === "ok") return "OK";
  if (highlight === "progress") return "IN PROGRESS";
  return "INFO";
}

export default function StatusStreamLogs() {
  const [logs, setLogs] = useState<VpnServersResponsesStatusStreamLogEntryResponse[]>(() => loadStoredLogs());
  const [loading, setLoading] = useState(false);
  const [clearingServerLogs, setClearingServerLogs] = useState(false);
  const [lastSyncUtc, setLastSyncUtc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const limit = hasLoadedOnceRef.current ? INCREMENTAL_FETCH_LIMIT : INITIAL_FETCH_LIMIT;
      const responseRaw = (await getApiOpenVpnServersStatusStreamLogs({
        limit,
      })) as unknown;

      const response = responseRaw as VpnServersResponsesStatusStreamLogsResponse;
      const responseEnvelope = responseRaw as ApiVpnServersResponsesStatusStreamLogsResponse;

      const incomingRaw = response?.logs ?? responseEnvelope?.data?.logs ?? [];
      const incoming = incomingRaw
        .map((x: VpnServersResponsesStatusStreamLogEntryResponse) => normalizeLog(x))
        .filter((x): x is VpnServersResponsesStatusStreamLogEntryResponse => x !== null)
        .filter((x) => parseOperationalPayload(x.payloadJson ?? "") !== null);

      setLogs((prev) => {
        const merged = mergeLogs(prev, incoming);
        saveStoredLogs(merged);
        return merged;
      });
      hasLoadedOnceRef.current = true;
      setLastSyncUtc(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
    const id = window.setInterval(() => {
      void fetchLogs();
    }, 5000);
    return () => window.clearInterval(id);
  }, [fetchLogs]);

  const summary = useMemo(
    () => {
      let errorEvents = 0;
      const slowCandidates: SlowServerEntry[] = [];
      for (const log of logs) {
        const operational = parseOperationalPayload(log.payloadJson ?? "");
        if (!operational) continue;
        const highlight = getEventHighlight(operational.eventType, operational.level);
        if (highlight === "error") errorEvents++;
        if (operational.eventType === "server-success" && operational.durationMs !== null) {
          slowCandidates.push({
            serverId: operational.serverId,
            serverName: operational.serverName,
            durationMs: operational.durationMs,
            timestampUtc: log.timestampUtc ?? null,
          });
        }
      }

      const grouped = new Map<
        string,
        { serverId: number | null; serverName: string | null; samples: number; totalDurationMs: number; maxDurationMs: number; lastDurationMs: number; }
      >();
      for (const item of slowCandidates) {
        const key = `${item.serverId ?? "unknown"}|${item.serverName ?? "unknown"}`;
        const existing = grouped.get(key);
        if (!existing) {
          grouped.set(key, {
            serverId: item.serverId,
            serverName: item.serverName,
            samples: 1,
            totalDurationMs: item.durationMs,
            maxDurationMs: item.durationMs,
            lastDurationMs: item.durationMs,
          });
          continue;
        }

        existing.samples += 1;
        existing.totalDurationMs += item.durationMs;
        existing.maxDurationMs = Math.max(existing.maxDurationMs, item.durationMs);
        existing.lastDurationMs = item.durationMs;
      }

      const topSlowServers: SlowServerAggregate[] = [...grouped.values()]
        .map((x) => ({
          serverId: x.serverId,
          serverName: x.serverName,
          maxDurationMs: x.maxDurationMs,
          avgDurationMs: Math.round(x.totalDurationMs / x.samples),
          samples: x.samples,
          lastDurationMs: x.lastDurationMs,
        }))
        .sort((a, b) => b.maxDurationMs - a.maxDurationMs)
        .slice(0, 5);

      return {
        total: logs.length,
        serviceEvents: logs.filter((x) => parseOperationalPayload(x.payloadJson ?? "") !== null).length,
        errorEvents,
        topSlowServers,
        fromRedis: logs.filter((x) => x.source === "redis").length,
        fromMemory: logs.filter((x) => x.source === "memory").length,
      };
    },
    [logs],
  );

  const clearBrowserLogs = () => {
    setLogs([]);
    saveStoredLogs([]);
  };

  const clearServerLogs = useCallback(async () => {
    const confirmed = window.confirm(
      "Clear status-stream logs on backend too? This removes shared history for all clients.",
    );
    if (!confirmed) return;

    setClearingServerLogs(true);
    setError(null);
    try {
      await deleteApiOpenVpnServersStatusStreamLogs();
      clearBrowserLogs();
      hasLoadedOnceRef.current = false;
      await fetchLogs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear server logs");
    } finally {
      setClearingServerLogs(false);
    }
  }, [fetchLogs]);

  return (
    <div className="status-stream-logs-page">
      <h2>Status Stream Logs</h2>

      <div className="status-stream-logs-toolbar">
        <button
          className="btn secondary"
          onClick={() => void fetchLogs()}
          disabled={loading || clearingServerLogs}
        >
          <FaSyncAlt className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
        </button>
        <button className="btn danger" onClick={() => void clearServerLogs()} disabled={clearingServerLogs}>
          <FaTrash className="icon" /> Clear Server Logs
        </button>
        <button className="btn danger" onClick={clearBrowserLogs}>
          <FaTrash className="icon" /> Clear Browser Logs
        </button>
      </div>

      <div className="status-stream-logs-summary">
        <p>
          <strong>Total in browser:</strong> {summary.total}
        </p>
        <p>
          <strong>Operational events:</strong> {summary.serviceEvents}
        </p>
        <p className={summary.errorEvents > 0 ? "status-stream-logs-error-strong" : undefined}>
          <strong>Error events:</strong> {summary.errorEvents}
        </p>
        <p>
          <strong>Redis source:</strong> {summary.fromRedis} | <strong>Memory source:</strong> {summary.fromMemory}
        </p>
        <div className="status-stream-logs-slow-servers">
          <strong>Top slow servers (unique, success only):</strong>
          {summary.topSlowServers.length === 0 ? (
            <p>Not enough successful polls yet.</p>
          ) : (
            <ul>
              {summary.topSlowServers.map((item) => (
                <li
                  key={`${item.serverId ?? "unknown"}:${item.serverName ?? "unknown"}`}
                >
                  {item.serverName ?? "Unknown"} #{item.serverId ?? "—"} - max {item.maxDurationMs} ms, avg{" "}
                  {item.avgDurationMs} ms, last {item.lastDurationMs} ms ({item.samples} samples)
                </li>
              ))}
            </ul>
          )}
        </div>
        <p>
          <strong>Last sync:</strong> {lastSyncUtc ? new Date(lastSyncUtc).toLocaleString() : "N/A"}
        </p>
        {error && (
          <p className="status-stream-logs-error">
            <strong>Error:</strong> {error}
          </p>
        )}
      </div>

      <div className="status-stream-logs-list">
        {logs.length === 0 ? (
          <p>No logs yet.</p>
        ) : (
          logs.map((log) => {
            const operational = parseOperationalPayload(log.payloadJson ?? "");
            const highlight = operational
              ? getEventHighlight(operational.eventType, operational.level)
              : "neutral";
            const badge = operational ? getHighlightLabel(highlight) : "INFO";

            return (
              <details key={logKey(log)} className={`status-stream-log-item status-stream-log-item--${highlight}`}>
                <summary>
                  <span>{new Date(log.timestampUtc ?? "").toLocaleString()} | source: {log.source ?? "unknown"}</span>
                  <span className={`status-stream-log-badge status-stream-log-badge--${highlight}`}>{badge}</span>
                </summary>
                {(() => {
                  if (operational) {
                  return (
                    <div className="status-stream-log-readable">
                      <p>
                        <strong>{operational.message}</strong>
                      </p>
                      <p>
                        <strong>Event:</strong> {operational.eventType} | <strong>Level:</strong>{" "}
                        {operational.level ?? "info"}
                      </p>
                      {operational.serverId !== null && (
                        <p>
                          <strong>Server:</strong> #{operational.serverId}
                          {operational.serverName ? ` (${operational.serverName})` : ""}
                          {operational.apiUrl ? ` | ${operational.apiUrl}` : ""}
                        </p>
                      )}
                      {operational.durationMs !== null && (
                        <p>
                          <strong>Duration:</strong> {operational.durationMs} ms
                        </p>
                      )}
                      {operational.details && (
                        <p>
                          <strong>Reason:</strong> {operational.details}
                        </p>
                      )}
                      {operational.metrics && (
                        <p>
                          <strong>Cycle stats:</strong>{" "}
                          {Object.entries(operational.metrics)
                            .filter(([, value]) => typeof value === "number")
                            .map(([key, value]) => `${key}=${value}`)
                            .join(", ")}
                        </p>
                      )}
                      <details>
                        <summary>Debug payload (raw JSON)</summary>
                        <pre>{prettyPayload(log.payloadJson ?? "")}</pre>
                      </details>
                    </div>
                  );
                  }

                  const payload = parsePayload(log.payloadJson ?? "");
                  if (!payload) {
                    return <pre>{prettyPayload(log.payloadJson ?? "")}</pre>;
                  }

                  return (
                    <div className="status-stream-log-readable">
                      <p>
                        <strong>Payload timestamp:</strong>{" "}
                        {payload.timestampUtc ? new Date(payload.timestampUtc).toLocaleString() : "N/A"}
                      </p>
                      <p>
                        <strong>Servers in payload:</strong> {payload.statuses.length}
                      </p>
                      <div className="status-stream-log-table-wrap">
                        <table className="status-stream-log-table">
                          <thead>
                            <tr>
                              <th>Server ID</th>
                              <th>Status</th>
                              <th>Clients</th>
                              <th>Sessions</th>
                              <th>Next Run</th>
                              <th>Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payload.statuses.map((s) => (
                              <tr key={`${logKey(log)}:${s.vpnServerId}`}>
                                <td>{s.vpnServerId}</td>
                                <td>{statusLabel(s.status)}</td>
                                <td>{s.countConnectedClients ?? "—"}</td>
                                <td>{s.countSessions ?? "—"}</td>
                                <td>{s.nextRunTime ? new Date(s.nextRunTime).toLocaleString() : "—"}</td>
                                <td>{s.errorMessage ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <details>
                        <summary>Debug payload (raw JSON)</summary>
                        <pre>{prettyPayload(log.payloadJson ?? "")}</pre>
                      </details>
                    </div>
                  );
                })()}
              </details>
            );
          })
        )}
      </div>
    </div>
  );
}
