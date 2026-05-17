import { useCallback, useEffect, useMemo, useState } from "react";
import { FaSyncAlt, FaTrash } from "react-icons/fa";
import { getApiOpenVpnServersStatusStreamLogs } from "../api/orval/vpn-servers/vpn-servers";
import type { VpnServersResponsesStatusStreamLogEntryResponse } from "../api/orvalModelShim";
import "../css/StatusStreamLogs.css";

const STORAGE_KEY = "status-stream-logs:v1";

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

export default function StatusStreamLogs() {
  const [logs, setLogs] = useState<VpnServersResponsesStatusStreamLogEntryResponse[]>(() => loadStoredLogs());
  const [loading, setLoading] = useState(false);
  const [lastSyncUtc, setLastSyncUtc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApiOpenVpnServersStatusStreamLogs({
        limit: 300,
      });

      const incomingRaw = response?.data?.logs ?? [];
      const incoming = incomingRaw
        .map((x) => normalizeLog(x))
        .filter((x): x is VpnServersResponsesStatusStreamLogEntryResponse => x !== null);

      setLogs((prev) => {
        const merged = mergeLogs(prev, incoming);
        saveStoredLogs(merged);
        return merged;
      });
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
    () => ({
      total: logs.length,
      fromRedis: logs.filter((x) => x.source === "redis").length,
      fromMemory: logs.filter((x) => x.source === "memory").length,
    }),
    [logs],
  );

  const clearBrowserLogs = () => {
    setLogs([]);
    saveStoredLogs([]);
  };

  return (
    <div className="status-stream-logs-page">
      <h2>Status Stream Logs</h2>

      <div className="status-stream-logs-toolbar">
        <button className="btn secondary" onClick={() => void fetchLogs()} disabled={loading}>
          <FaSyncAlt className={`icon ${loading ? "icon-spin" : ""}`} /> Refresh
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
          <strong>Redis source:</strong> {summary.fromRedis} | <strong>Memory source:</strong>{" "}
          {summary.fromMemory}
        </p>
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
          logs.map((log) => (
            <details key={logKey(log)} className="status-stream-log-item">
              <summary>
                {new Date(log.timestampUtc ?? "").toLocaleString()} | source: {log.source ?? "unknown"}
              </summary>
              <pre>{prettyPayload(log.payloadJson ?? "")}</pre>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
