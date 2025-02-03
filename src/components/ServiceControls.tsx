import { FaPlay } from "react-icons/fa";

type Props = {
  serviceStatus: string;
  nextRunTime: string;
  onRunNow: () => void;
};

export default function ServiceControls({ serviceStatus, nextRunTime, onRunNow }: Props) {
  return (
    <div className="service-status-container">
      <h2>Service control</h2>
      <p><strong>Service Status:</strong> {serviceStatus}</p>
      <p><strong>Next Run:</strong> {nextRunTime}</p>

      <button
        className="btn primary"
        onClick={onRunNow}
        disabled={serviceStatus === "Running"}
      >
        <FaPlay /> Run Now
      </button>
    </div>
  );
}
