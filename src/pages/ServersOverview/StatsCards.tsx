import { formatBytes, type SeriesExtreme } from "./helpers";

type Totals = {
  sessionsCount: number;
  devicesCount: number;
  accountsCount: number;
  trafficInBytes: number;
  trafficOutBytes: number;
  trafficTotalBytes: number;
  devicesPeak?: SeriesExtreme | null;
  devicesLow?: SeriesExtreme | null;
  sessionsPeak?: SeriesExtreme | null;
  sessionsLow?: SeriesExtreme | null;
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
      <Card
        title="Devices (unique externalId)"
        value={totals.devicesCount}
        extremes={[
          { label: "Peak concurrent", extreme: totals.devicesPeak },
          { label: "Low concurrent", extreme: totals.devicesLow },
        ]}
      />
      <Card title="Users (accounts)" value={totals.accountsCount} />
      <Card
        title="Sessions"
        value={totals.sessionsCount}
        extremes={[
          { label: "Peak concurrent", extreme: totals.sessionsPeak },
          { label: "Low concurrent", extreme: totals.sessionsLow },
        ]}
      />
      <Card title="Traffic IN (total)" value={formatBytes(totals.trafficInBytes)} />
      <Card title="Traffic OUT (total)" value={formatBytes(totals.trafficOutBytes)} />
      <Card title="Traffic TOTAL" value={formatBytes(totals.trafficTotalBytes)} />

      {loading && <Card title="Status" value="Loading…" />}
    </div>
  );
}

function formatExtreme(extreme: SeriesExtreme | null | undefined): string | null {
  if (!extreme) return null;
  return `${extreme.count} · ${extreme.atLabel}`;
}

function Card({
  title,
  value,
  extremes,
}: {
  title: string;
  value: string | number;
  extremes?: { label: string; extreme: SeriesExtreme | null | undefined }[];
}) {
  const rows = (extremes ?? [])
    .map((e) => ({ label: e.label, text: formatExtreme(e.extreme) }))
    .filter((e): e is { label: string; text: string } => e.text != null);

  return (
    <div
      style={{
        padding: 12,
        border: "1px solid var(--border-color)",
        borderRadius: 12,
        background: "var(--bg-body)",
        color: "var(--text-secondary)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ fontSize: "var(--font-size-sm)", opacity: 0.7 }}>{title}</div>
      <div style={{ fontWeight: 700, fontSize: "var(--font-size-xl)", wordBreak: "break-word" }}>
        {value}
      </div>
      {rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
          {rows.map((row) => (
            <div
              key={row.label}
              style={{
                fontSize: "var(--font-size-sm)",
                opacity: 0.85,
                display: "flex",
                flexWrap: "wrap",
                gap: "0 6px",
              }}
            >
              <span style={{ opacity: 0.7 }}>{row.label}</span>
              <span style={{ fontWeight: 600 }}>{row.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
