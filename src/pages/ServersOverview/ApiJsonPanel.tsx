import type { OverviewSeriesResponse } from "../../api/orval/model";

export default function ApiJsonPanel({ data }: { data: OverviewSeriesResponse }) {
  const json = JSON.stringify(data, null, 2);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>API response {data?.summary ? "(live or fallback)" : ""}</div>
        <button
          onClick={() => navigator.clipboard.writeText(json)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #30363d", background: "#0d1117", color: "#c9d1d9", cursor: "pointer", fontWeight: 700 }}
          title="Copy JSON"
        >
          Copy JSON
        </button>
      </div>
      <pre style={{ margin: 0, padding: 12, borderRadius: 8, overflow: "auto", background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9", fontSize: 12, lineHeight: 1.4 }}>
        {json}
      </pre>
    </div>
  );
}
