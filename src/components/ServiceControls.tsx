// src/components/ServiceControls.tsx
import { FaPlay } from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";
import type { ServiceStatusDto } from "../api/orval/model/serviceStatusDto";
import type { ServiceStatus } from "../api/orval/model/serviceStatus";

type Props = {
  serviceData: Record<number, ServiceStatusDto>;
  onRunNow: () => void;
};

function toLabel(s?: ServiceStatus): "Idle" | "Running" | "Error" {
  // orval ServiceStatus expected: 0 | 1 | 2
  if (s === 1) return "Running";
  if (s === 2) return "Error";
  return "Idle";
}

function isValidNextRun(x?: string): boolean {
  if (!x || x === "N/A") return false;
  const ms = new Date(x).getTime();
  return Number.isFinite(ms);
}

export default function ServiceControls({ serviceData, onRunNow }: Props) {
  const entries = useMemo(() => Object.values(serviceData), [serviceData]);

  const totals = useMemo(() => {
    let clients = 0;
    let sessions = 0;
    for (const s of entries) {
      if (typeof s.countConnectedClients === "number") clients += s.countConnectedClients;
      if (typeof s.countSessions === "number") sessions += s.countSessions;
    }
    return { clients, sessions };
  }, [entries]);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const anyRunning = entries.some((e) => toLabel(e.status) === "Running");
      if (anyRunning) {
        setTimeLeft(0);
        return;
      }

      const validTimes = entries
        .map((e) => e.nextRunTime)
        .filter(isValidNextRun)
        .map((t) => new Date(String(t)).getTime());

      if (validTimes.length === 0) {
        setTimeLeft(null);
        return;
      }

      const soonest = Math.min(...validTimes);
      const diffSec = Math.max(0, Math.floor((soonest - Date.now()) / 1000));
      setTimeLeft(diffSec);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [entries]);

  const statusDescription = useMemo(() => {
    if (entries.some((e) => toLabel(e.status) === "Running")) return "The service is currently running.";
    if (entries.some((e) => toLabel(e.status) === "Error")) return "There is an error with the service.";
    return "The service is idle.";
  }, [entries]);

  const statusColor = useMemo(() => {
    if (entries.some((e) => toLabel(e.status) === "Running")) return "#1E90FF";
    if (entries.some((e) => toLabel(e.status) === "Error")) return "red";
    return "green";
  }, [entries]);

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

      <button className="btn primary" onClick={onRunNow}>
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
