import { Link } from "react-router-dom";

type Props = {
  vpnServerId?: number;
};

export function UserStatisticsAccessDenied({ vpnServerId }: Props) {
  const backTo =
    vpnServerId != null
      ? `/servers/${vpnServerId}/statistics`
      : "/servers";

  return (
    <div
      className="settings-card"
      style={{
        marginBottom: 16,
        padding: "16px 20px",
        borderRadius: 8,
        border: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-card)",
        color: "var(--text-secondary)",
        lineHeight: 1.5,
      }}
      role="alert"
    >
      <p style={{ margin: "0 0 12px", color: "var(--text-primary)", fontWeight: 600 }}>
        Access restricted
      </p>
      <p style={{ margin: "0 0 12px" }}>
        Your role does not allow viewing other users&apos; statistics.
      </p>
      <Link className="btn primary" to={backTo} style={{ display: "inline-block", textDecoration: "none" }}>
        Back to aggregate statistics
      </Link>
    </div>
  );
}
