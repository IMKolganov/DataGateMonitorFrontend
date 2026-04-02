// src/components/ServiceControls.tsx
import { FaPlay } from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";
import type { ServiceStatusDto } from "../api/orval/model";
import type { ServiceStatus } from "../api/orval/model";

type Props = {
  serviceData: Record<number, ServiceStatusDto>;
  onRunNow: () => void;
};

type UiStatus = "Idle" | "Running" | "Error" | "Pending";

function normalizeStatus(s?: ServiceStatus | string | number | null): UiStatus {
  if (s === undefined || s === null) return "Pending";
  if (s === 1 || s === "Running" || s === "running") return "Running";
  if (s === 2 || s === "Error" || s === "error") return "Error";
  return "Idle";
}

function toMs(v: unknown): number | null {
  if (typeof v === "string") {
    if (!v || v === "N/A") return null;
    const ms = new Date(v).getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  if (v instanceof Date) {
    const ms = v.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  return null;
}

function getNextRunSeconds(entries: ServiceStatusDto[]): number | null {
  // 1) Prefer nextRunInSeconds if backend ever sends it (common with SignalR push)
  const secondsCandidates = entries
      .map((e) => (e as any)?.nextRunInSeconds)
      .filter((x: unknown) => typeof x === "number" && Number.isFinite(x) && x >= 0) as number[];

  if (secondsCandidates.length > 0) return Math.min(...secondsCandidates);

  // 2) Fallback to nextRunTime (ISO string)
  const msCandidates = entries
      .map((e) => toMs((e as any)?.nextRunTime))
      .filter((x): x is number => typeof x === "number");

  if (msCandidates.length === 0) return null;

  const soonestMs = Math.min(...msCandidates);
  const diffSec = Math.max(0, Math.floor((soonestMs - Date.now()) / 1000));
  return diffSec;
}

export default function ServiceControls({ serviceData, onRunNow }: Props) {
  const entries = useMemo(() => Object.values(serviceData ?? {}), [serviceData]);

  const totals = useMemo(() => {
    let clients = 0;
    let sessions = 0;

    for (const s of entries) {
      if (typeof s.countConnectedClients === "number") clients += s.countConnectedClients;
      if (typeof s.countSessions === "number") sessions += s.countSessions;
    }

    return { clients, sessions };
  }, [entries]);

  const anyRunning = useMemo(
      () => entries.some((e) => normalizeStatus((e as any)?.status) === "Running"),
      [entries]
  );

  const anyError = useMemo(
      () => entries.some((e) => normalizeStatus((e as any)?.status) === "Error"),
      [entries]
  );

  const anyPending = useMemo(
      () => entries.some((e) => normalizeStatus((e as any)?.status) === "Pending"),
      [entries]
  );

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      if (anyRunning) {
        setTimeLeft(0);
        return;
      }

      const live = entries.filter(
          (e) => (e as any)?.status !== undefined && (e as any)?.status !== null,
      );
      const sec = getNextRunSeconds(live);
      setTimeLeft(sec);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [entries, anyRunning]);

  const statusDescription = useMemo(() => {
    if (anyRunning) return "The service is currently running.";
    if (anyError) return "There is an error with the service.";
    if (anyPending) return "Waiting for live status from the background service (WebSocket).";
    return "The service is idle.";
  }, [anyRunning, anyError, anyPending]);

  const statusColor = useMemo(() => {
    if (anyRunning) return "#1E90FF";
    if (anyError) return "red";
    if (anyPending) return "#8b949e";
    return "green";
  }, [anyRunning, anyError, anyPending]);

  return (
      <div className="service-status-container">
        <h2>Service Control</h2>
        <div style={{ borderTop: "1px solid #d1d5da" }} />

        <p>
          <strong>Service Status:</strong>{" "}
          <span style={{ color: statusColor }}>{statusDescription}</span>
        </p>

        <p>
          <strong>Next Run:</strong>{" "}
          {timeLeft !== null ? `${timeLeft}s` : "N/A"}
        </p>

        <p>
          <strong>Total Connected Clients:</strong> {totals.clients}
        </p>

        <p>
          <strong>Total Sessions:</strong> {totals.sessions.toLocaleString()}
        </p>

        <button className="btn primary" onClick={onRunNow} disabled={anyRunning}>
          <FaPlay className="icon" /> Sync All Now
        </button>

        <p className="description" style={{ marginTop: 12 }}>
          This service periodically queries the OpenVPN server to collect data about connected clients
          and stores this information in the database. Use the button below to manually trigger the service
          and update the data immediately.
        </p>
      </div>
  );
}
