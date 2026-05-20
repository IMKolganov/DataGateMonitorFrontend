type Props = {
  className?: string;
};

/** Shown when the server is visible in the dashboard but not allowed for VPN connect on the user's quota plan. */
export function QuotaPlanViewOnlyNotice({ className }: Props) {
  return (
    <div
      role="status"
      className={className}
      style={{
        marginBottom: 16,
        padding: "12px 16px",
        borderRadius: 8,
        border: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-card)",
        color: "var(--text-secondary)",
        lineHeight: 1.5,
        fontSize: 14,
      }}
    >
      This server is not included in your quota plan. You can view status and statistics here; connecting through
      this server is not available on your plan.
    </div>
  );
}
