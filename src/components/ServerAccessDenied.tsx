type Props = {
  title?: string;
  message?: string;
};

export function ServerAccessDenied({
  title = "Access restricted",
  message = "You cannot use this feature on this VPN server with your current quota plan. You can still view server details elsewhere in the dashboard.",
}: Props) {
  return (
    <div
      role="alert"
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
    >
      <p style={{ margin: "0 0 8px", color: "var(--text-primary)", fontWeight: 600 }}>{title}</p>
      <p style={{ margin: 0 }}>{message}</p>
    </div>
  );
}
