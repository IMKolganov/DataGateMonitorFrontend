import { FaPlay } from "react-icons/fa";
import { useEffect, useState } from "react";

type Props = {
  serviceData: Record<string, { status: string; errorMessage: string | null; nextRunTime: string }>;
  onRunNow: () => void;
};

export default function ServiceControls({ serviceData, onRunNow }: Props) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const nextRunTimes = Object.values(serviceData).map((s) => s.nextRunTime).filter((t) => t !== "N/A");

      if (nextRunTimes.length === 0) {
        console.warn("⚠️ No valid nextRunTime, skipping calculation.");
        setTimeLeft(null);
        return;
      }

      const soonestTime = Math.min(...nextRunTimes.map((t) => new Date(t).getTime()));
      const now = new Date().getTime();

      if (isNaN(soonestTime)) {
        console.error("🚨 ERROR: Failed to parse `nextRunTime`:", nextRunTimes);
        setTimeLeft(null);
        return;
      }

      const difference = Math.max(0, Math.floor((soonestTime - now) / 1000));
      setTimeLeft(difference);
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
      <button className="btn primary" onClick={onRunNow}>
        <FaPlay /> Sync All Now
      </button>
      <p className="description">
        This service periodically queries the OpenVPN server to collect data about connected clients
        and stores this information in the database. Use the button below to manually trigger the service
        and update the data immediately.
      </p>
    </div>
  );
}
