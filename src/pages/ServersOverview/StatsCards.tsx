import type { IconType } from "react-icons";
import {
  FaArrowDown,
  FaArrowUp,
  FaArrowsAltV,
  FaDesktop,
  FaInfoCircle,
  FaPlug,
  FaUsers,
} from "react-icons/fa";
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
        icon={FaDesktop}
        title="Devices (unique externalId)"
        value={totals.devicesCount}
        extremes={[
          { icon: FaArrowUp, label: "Peak concurrent", extreme: totals.devicesPeak },
          { icon: FaArrowDown, label: "Low concurrent", extreme: totals.devicesLow },
        ]}
      />
      <Card icon={FaUsers} title="Users (accounts)" value={totals.accountsCount} />
      <Card
        icon={FaPlug}
        title="Sessions"
        value={totals.sessionsCount}
        extremes={[
          { icon: FaArrowUp, label: "Peak concurrent", extreme: totals.sessionsPeak },
          { icon: FaArrowDown, label: "Low concurrent", extreme: totals.sessionsLow },
        ]}
      />
      <Card icon={FaArrowDown} title="Traffic IN (total)" value={formatBytes(totals.trafficInBytes)} />
      <Card icon={FaArrowUp} title="Traffic OUT (total)" value={formatBytes(totals.trafficOutBytes)} />
      <Card icon={FaArrowsAltV} title="Traffic TOTAL" value={formatBytes(totals.trafficTotalBytes)} />

      {loading && <Card icon={FaInfoCircle} title="Status" value="Loading…" />}
    </div>
  );
}

function formatExtreme(extreme: SeriesExtreme | null | undefined): string | null {
  if (!extreme) return null;
  return `${extreme.count} · ${extreme.atLabel}`;
}

type ExtremeRow = {
  icon?: IconType;
  label: string;
  extreme: SeriesExtreme | null | undefined;
};

function Card({
  icon: Icon,
  title,
  value,
  extremes,
}: {
  icon?: IconType;
  title: string;
  value: string | number;
  extremes?: ExtremeRow[];
}) {
  const rows = (extremes ?? []).flatMap((e) => {
    const text = formatExtreme(e.extreme);
    return text == null ? [] : [{ icon: e.icon, label: e.label, text }];
  });

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
      <div
        style={{
          fontSize: "var(--font-size-sm)",
          opacity: 0.7,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {Icon && <Icon className="icon" aria-hidden />}
        <span>{title}</span>
      </div>
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
                alignItems: "center",
                gap: "0 6px",
              }}
            >
              {row.icon && <row.icon className="icon" aria-hidden style={{ opacity: 0.7 }} />}
              <span style={{ opacity: 0.7 }}>{row.label}</span>
              <span style={{ fontWeight: 600 }}>{row.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
