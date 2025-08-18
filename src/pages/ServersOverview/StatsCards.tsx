import { formatBytes } from "./helpers";

export default function StatsCards({
  totals,
}: {
  totals: { servers: number; clients: number; currentIn: number; currentOut: number; totalIn: number; totalOut: number; sessions: number; defaults: number };
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 12 }}>
      <Card title="Connected clients" value={totals.clients} />
      <Card title="Sessions" value={totals.sessions} />
      <Card title="Current IN" value={formatBytes(totals.currentIn)} />
      <Card title="Current OUT" value={formatBytes(totals.currentOut)} />
      <Card title="Total IN" value={formatBytes(totals.totalIn)} />
      <Card title="Total OUT" value={formatBytes(totals.totalOut)} />
      <Card title="Default servers" value={totals.defaults} />
    </div>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div style={{ padding: 12, border: "1px solid #30363d", borderRadius: 12, background: "#0d1117", color: "#c9d1d9", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
      <div style={{ fontWeight: 700, fontSize: 18 }}>{value}</div>
    </div>
  );
}
