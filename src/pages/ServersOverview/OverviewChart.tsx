import { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import type { MergedChartPoint } from "./types";
import type { TooltipProps } from "recharts";

export type OverviewChartMode = "combined" | "sessions" | "users" | "traffic";

const MODE_OPTIONS: { id: OverviewChartMode; label: string; hint: string }[] = [
  { id: "combined", label: "All together", hint: "Sessions, unique users, and traffic on one chart (two Y-axes)." },
  { id: "sessions", label: "Sessions", hint: "Active client sessions over time." },
  { id: "users", label: "Users", hint: "Active unique users (externalId) over time." },
  { id: "traffic", label: "Traffic", hint: "Total traffic per bucket (MB)." },
];

const tooltipFormatter = ((value, name) => {
  if (name === "Traffic, MB") return [`${value} MB`, name ?? ""];
  return [value, name ?? ""];
}) as NonNullable<TooltipProps["formatter"]>;

/** Fixed px height avoids Recharts measuring 0×0 when % height resolves badly in flex/hidden layouts. */
const CHART_PX = 280;

export default function OverviewChart({
  data, loading, error,
}: {
  data: MergedChartPoint[];
  loading: boolean;
  error: string | null;
}) {
  const [mode, setMode] = useState<OverviewChartMode>("combined");
  const modeMeta = MODE_OPTIONS.find((m) => m.id === mode) ?? MODE_OPTIONS[0];

  const statusSuffix = loading ? " — loading..." : error ? " — failed" : "";

  return (
    <div
      className="overview-chart-wrap"
      style={{
        border: "1px solid var(--border-color)",
        borderRadius: 12,
        background: "var(--bg-body)",
        padding: 12,
        marginBottom: 12,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>
            Overview{statusSuffix}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, maxWidth: 520 }}>
            {modeMeta.hint}
          </div>
        </div>
        <div role="tablist" aria-label="Chart metric" style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {MODE_OPTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid var(--border-color)",
                background: mode === m.id ? "var(--bg-content-alt)" : "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: 12,
                lineHeight: 1.25,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          width: "100%",
          height: CHART_PX,
          minWidth: 0,
          minHeight: CHART_PX,
        }}
      >
        <ResponsiveContainer width="100%" height={CHART_PX}>
        <AreaChart data={data} margin={{ top: 10, right: mode === "combined" || mode === "traffic" ? 20 : 12, left: 0, bottom: 28 }}>
          <defs>
            <linearGradient id="fillActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#58a6ff" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#58a6ff" stopOpacity={0.06} />
            </linearGradient>
            <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a371f7" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#a371f7" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="fillMb" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3fb950" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3fb950" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} />
          {mode === "combined" && (
            <>
              <YAxis yAxisId="left" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} allowDecimals={false} width={48} />
              <YAxis yAxisId="right" orientation="right" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} tickFormatter={(v) => `${v} MB`} width={64} />
            </>
          )}
          {mode === "sessions" && (
            <YAxis yAxisId="left" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} allowDecimals={false} width={52} />
          )}
          {mode === "users" && (
            <YAxis yAxisId="left" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} allowDecimals={false} width={52} />
          )}
          {mode === "traffic" && (
            <YAxis yAxisId="right" orientation="right" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} tickFormatter={(v) => `${v} MB`} width={64} />
          )}
          <Tooltip formatter={tooltipFormatter} />
          {mode === "combined" && (
            <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 11 }} iconSize={8} iconType="square" />
          )}
          {mode === "combined" && (
            <>
              <Area yAxisId="left" type="monotone" dataKey="active" name="Sessions" stroke="#58a6ff" fill="url(#fillActive)" strokeWidth={2} dot={false} />
              <Area yAxisId="left" type="monotone" dataKey="activeUsers" name="Active users" stroke="#a371f7" fill="url(#fillUsers)" strokeWidth={2} dot={false} />
              <Area yAxisId="right" type="monotone" dataKey="mb" name="Traffic, MB" stroke="#3fb950" fill="url(#fillMb)" strokeWidth={2} dot={false} />
            </>
          )}
          {mode === "sessions" && (
            <Area yAxisId="left" type="monotone" dataKey="active" name="Sessions" stroke="#58a6ff" fill="url(#fillActive)" strokeWidth={2} dot={false} />
          )}
          {mode === "users" && (
            <Area yAxisId="left" type="monotone" dataKey="activeUsers" name="Active users" stroke="#a371f7" fill="url(#fillUsers)" strokeWidth={2} dot={false} />
          )}
          {mode === "traffic" && (
            <Area yAxisId="right" type="monotone" dataKey="mb" name="Traffic, MB" stroke="#3fb950" fill="url(#fillMb)" strokeWidth={2} dot={false} />
          )}
        </AreaChart>
        </ResponsiveContainer>
      </div>

      {!!error && (
        <div style={{ marginTop: 8, color: "#f85149", fontSize: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
