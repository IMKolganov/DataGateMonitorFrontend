import { FaPlay } from "react-icons/fa";
import { useEffect, useState } from "react";

type Props = {
  serviceStatus: string;
  nextRunTime: string;
  onRunNow: () => void;
};

export default function ServiceControls({ serviceStatus, nextRunTime, onRunNow }: Props) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!nextRunTime) return;

      const [datePart, timePart] = nextRunTime.split(", ");
      const [day, month, year] = datePart.split(".");
      const nextRunTimestamp = new Date(`${year}-${month}-${day}T${timePart}`).getTime();

      if (isNaN(nextRunTimestamp)) {
        setTimeLeft(null);
        return;
      }
      const now = Date.now();
      const difference = Math.max(0, Math.floor((nextRunTimestamp - now) / 1000));
      setTimeLeft(difference);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [nextRunTime]);

  const renderStatusDescription = () => {
    switch (serviceStatus) {
      case "Idle":
        return "The service is currently idle and waiting for the next scheduled run.";
      case "Running":
        return "The service is actively querying the OpenVPN server and saving data to the database.";
      case "Error":
        return "An error occurred while the service was running. Please check the logs for details.";
      default:
        return "Unknown service status.";
    }
  };

  const getStatusColor = () => {
    switch (serviceStatus) {
      case "Idle":
        return "green";
      case "Running":
        return "#1E90FF";
      case "Error":
        return "red";
      default:
        return "gray";
    }
  };

  return (
    <div className="service-status-container">
      <h2>Service Control</h2>
      <p>
        <strong>Service Status:</strong>{" "}
        <span style={{ color: getStatusColor() }}>{serviceStatus}</span>
      </p>
      <p className="description">{renderStatusDescription()}</p>
      <p>
        <strong>Next Run:</strong> {nextRunTime} {timeLeft !== null ? ` - ${timeLeft}s` : " (Invalid Time)"}
      </p>
      <p className="description">
        This service periodically queries the OpenVPN server to collect data about connected clients
        and stores this information in the database. Use the button below to manually trigger the service
        and update the data immediately.
      </p>
      <button className="btn primary" onClick={onRunNow} disabled={serviceStatus === "Running"}>
        <FaPlay /> Run Now
      </button>
    </div>
  );
}
