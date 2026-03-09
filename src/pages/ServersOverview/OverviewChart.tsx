import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import type { MergedChartPoint } from "./types";
import type { TooltipProps } from "recharts";
type TValue = number | string;
type TName = string;

const tooltipFormatter: TooltipProps<TValue, TName>["formatter"] = (value, name) => {
  if (name === "Traffic, MB") return [`${value} MB`, name ?? ""];
  return [value, name ?? ""];
};

export default function OverviewChart({
  data, loading, error,
}: {
  data: MergedChartPoint[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="overview-chart-wrap" style={{ border: "1px solid var(--border-color)", borderRadius: 12, background: "var(--bg-body)", padding: 12, height: 360, marginBottom: 12 }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>
        Sessions, users & traffic {loading ? " — loading..." : error ? " — failed" : ""}
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 28 }}>
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
          <YAxis yAxisId="left" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} allowDecimals={false} width={48} />
          <YAxis yAxisId="right" orientation="right" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} tickFormatter={(v) => `${v} MB`} width={64} />
          <Tooltip formatter={tooltipFormatter} />
          <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 11 }} iconSize={8} iconType="square" />
          <Area yAxisId="left" type="monotone" dataKey="active" name="Sessions" stroke="#58a6ff" fill="url(#fillActive)" strokeWidth={2} dot={false} />
          <Area yAxisId="left" type="monotone" dataKey="activeUsers" name="Active Users" stroke="#a371f7" fill="url(#fillUsers)" strokeWidth={2} dot={false} />
          <Area yAxisId="right" type="monotone" dataKey="mb" name="Traffic, MB" stroke="#3fb950" fill="url(#fillMb)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      {!!error && (
        <div style={{ marginTop: 8, color: "#f85149", fontSize: 12 }}>
          {error}
        </div>
      )}
    </div>
  );
}
