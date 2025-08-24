import { FaPlay } from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";

type ServiceEntry = {
  status: string;
  errorMessage: string | null;
  nextRunTime: string;

  countConnectedClients?: number;
  countSessions?: number;
};

type Props = {
  serviceData: Record<string, ServiceEntry>;
  onRunNow: () => void;
};

export default function ServiceControls({ serviceData, onRunNow }: Props) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const { totalClients, totalSessions } = useMemo(() => {
    let clients = 0;
    let sessions = 0;

    for (const s of Object.values(serviceData)) {
      const cc = Number(s.countConnectedClients);
      const cs = Number(s.countSessions);
      if (Number.isFinite(cc)) clients += cc;
      if (Number.isFinite(cs)) sessions += cs;
    }

    return { totalClients: clients, totalSessions: sessions };
  }, [serviceData]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const statuses = Object.values(serviceData).map((s) => s.status);
      const isRunning = statuses.includes("Running");

      if (isRunning) {
        setTimeLeft(0);
        return;
      }

      const nextRunTimes = Object.values(serviceData)
        .map((s) => s.nextRunTime)
        .filter((t) => t !== "N/A");

      if (nextRunTimes.length === 0) {
        setTimeLeft(null);
        return;
      }

      const soonestTime = Math.min(...nextRunTimes.map((t) => new Date(t).getTime()));
      const now = Date.now();

      if (isNaN(soonestTime)) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft(Math.max(0, Math.floor((soonestTime - now) / 1000)));
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [serviceData]);

  const renderStatusDescription = () => {
    const statuses = Object.values(serviceData).map((s) => s.status);
    if (statuses.includes("Running")) return "The service is currently running.";
    if (statuses.includes("Error")) return "There is an error with the service.";
    return "The service is idle.";
  };

  const getStatusColor = () => {
    const statuses = Object.values(serviceData).map((s) => s.status);
    if (statuses.includes("Running")) return "#1E90FF";
    if (statuses.includes("Error")) return "red";
    return "green";
  };

  return (
    <div className="service-status-container">
      <h2>Service Control</h2>
      <div style={{ borderTop: "1px solid #d1d5da" }}></div>

      <p>
        <strong>Service Status:</strong>{" "}
        <span style={{ color: getStatusColor() }}>{renderStatusDescription()}</span>
      </p>
      <p>
        <strong>Next Run:</strong> {timeLeft !== null ? `${timeLeft}s` : "N/A"}
      </p>

      <p>
        <strong>Total Connected Clients:</strong> {totalClients}
      </p>
      <p>
        <strong>Total Sessions:</strong> {totalSessions.toLocaleString()}
      </p>

      <button className="btn primary" onClick={onRunNow}>
        {FaPlay({ className: "icon" })} Sync All Now
      </button>

      <p className="description">
        This service periodically queries the OpenVPN server to collect data about connected clients
        and stores this information in the database. Use the button below to manually trigger the service
        and update the data immediately.
      </p>
    </div>
  );
}
