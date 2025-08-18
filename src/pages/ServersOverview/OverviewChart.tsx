import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import type { ChartPoint } from "./types";

export default function OverviewChart({
  data, loading, error,
}: {
  data: ChartPoint[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <div style={{ border: "1px solid #30363d", borderRadius: 12, background: "#0d1117", padding: 12, height: 360, marginBottom: 12 }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>
        User activity & traffic {loading ? " — loading..." : error ? " — failed" : ""}
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#58a6ff" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#58a6ff" stopOpacity={0.06} />
            </linearGradient>
            <linearGradient id="fillMb" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3fb950" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3fb950" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#21262d" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} />
          <YAxis yAxisId="left"  stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} allowDecimals={false} width={48} />
          <YAxis yAxisId="right" orientation="right" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} tickFormatter={(v) => `${v} MB`} width={64} />
          <Tooltip
            contentStyle={{ background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9" }}
            labelStyle={{ color: "#c9d1d9" }}
            cursor={{ stroke: "#30363d" }}
            formatter={(value: any, name: string) => (name === "Traffic, MB" ? [`${value} MB`, name] : [value, name])}
          />
          <Legend wrapperStyle={{ color: "#c9d1d9" }} />
          <Area yAxisId="left"  type="monotone" dataKey="active" name="Active clients" stroke="#58a6ff" fill="url(#fillActive)" strokeWidth={2} dot={false} />
          <Area yAxisId="right" type="monotone" dataKey="mb"     name="Traffic, MB"    stroke="#3fb950" fill="url(#fillMb)"    strokeWidth={2} dot={false} />
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
