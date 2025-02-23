import { FaPlay } from "react-icons/fa";
import { useEffect, useState } from "react";

type Props = {
  serviceStatus: string;
  errorMessage?: string | null;
  nextRunTime: string;
  onRunNow: () => void;
};

export default function ServiceControls({ serviceStatus, errorMessage, nextRunTime, onRunNow }: Props) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!nextRunTime || nextRunTime === "N/A") {
        console.warn("⚠️ No valid nextRunTime, skipping calculation.");
        setTimeLeft(null);
        return;
      }
  
      const parsedDate = new Date(nextRunTime);
      const eventTime = parsedDate.getTime(); // Получаем UTC миллисекунды
      const now = new Date().getTime(); // Текущее UTC время
  
      console.log("🕒 Now (UTC):", now);
      console.log("🕒 Next Run (UTC):", parsedDate.toISOString(), "| eventTime (ms):", eventTime);
      console.log("🕒 Time Difference:", eventTime - now, "ms");
  
      if (isNaN(eventTime)) {
        console.error("🚨 ERROR: Failed to parse `nextRunTime`:", nextRunTime);
        setTimeLeft(null);
        return;
      }
  
      const difference = Math.max(0, Math.floor((eventTime - now) / 1000));
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
        return `An error occurred while the service was running. Please check the logs for details. Error: ${errorMessage || "Unknown error"}`;
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

  const handleRunNow = async () => {
    console.log("Running service now...");
    await onRunNow();
  };

  return (
    <div className="service-status-container">
      <h2>Service Control</h2>
      <div style={{ borderTop: "1px solid #d1d5da" }}></div>
      <p>
        <strong>Service Status:</strong>{" "}
        <span style={{ color: getStatusColor() }}>{serviceStatus}</span>
      </p>
      {serviceStatus === "Error" && (
        <p style={{ color: "red" }}>
          <strong>Error Message:</strong> {errorMessage || "No details available"}
        </p>
      )}
      <p className="description">{renderStatusDescription()}</p>
      <p>
        <strong>Next Run:</strong> {new Date(nextRunTime).toLocaleString()} 
        {timeLeft !== null ? ` - ${timeLeft}s` : " (Invalid Time)"}
      </p>
      <button className="btn primary" onClick={handleRunNow} disabled={serviceStatus === "Running"}>
        <FaPlay /> Run Now
      </button>
    </div>
  );
}
