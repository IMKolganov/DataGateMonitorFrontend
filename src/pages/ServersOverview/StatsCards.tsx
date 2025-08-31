import { formatBytes } from "./helpers";

type Totals = {
  sessionsCount: number;
  usersCount: number;
  trafficInBytes: number;
  trafficOutBytes: number;
  trafficTotalBytes: number;
};

type Props = {
  totals: Totals;
  loading?: boolean;
};

export default function StatsCards({ totals, loading }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
        marginBottom: 12,
      }}
    >
      <Card title="Users (unique externalId)" value={totals.usersCount} />
      <Card title="Sessions" value={totals.sessionsCount} />
      <Card title="Traffic IN (total)" value={formatBytes(totals.trafficInBytes)} />
      <Card title="Traffic OUT (total)" value={formatBytes(totals.trafficOutBytes)} />
      <Card title="Traffic TOTAL" value={formatBytes(totals.trafficTotalBytes)} />

      {loading && <Card title="Status" value="Loading…" />}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div
      style={{
        padding: 12,
        border: "1px solid #30363d",
        borderRadius: 12,
        background: "#0d1117",
        color: "#c9d1d9",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
      <div style={{ fontWeight: 700, fontSize: 18, wordBreak: "break-word" }}>
        {value}
      </div>
    </div>
  );
}
