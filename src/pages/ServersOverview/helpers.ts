import type { Grouping } from "../../components/DateRangeFilter";
import type { ChartPoint } from "./types";
import type {
  OverviewSeriesResponse,
  OverviewSeriesRowDto,
} from "../../api/orval/model";

/* ---- time helpers ---- */
export function startOfToday() { const n = new Date(); n.setHours(0,0,0,0); return n; }
export function endOfToday()   { const n = new Date(); n.setHours(23,59,59,999); return n; }
export function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }

/* ---- formatters ---- */
export function formatBytes(v: number): string {
  if (!Number.isFinite(v)) return "-";
  const units = ["B","KB","MB","GB","TB"];
  let i = 0; let n = v;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 ? 2 : 1)} ${units[i]}`;
}

export function formatLabel(d: Date, mode: Exclude<Grouping,"auto">): string {
  if (mode === "hours")
    return d.toLocaleTimeString(undefined, { hour: "2-digit", day: "2-digit", month: "short" });
  if (mode === "days")
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (mode === "months")
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  return String(d.getFullYear());
}

/* ---- build chart from API ---- */
export function toChartPoints(
  rows: OverviewSeriesRowDto[],
  mode: Exclude<Grouping,"auto">
): ChartPoint[] {
  return rows.map(r => {
    const totalBytes = r.trafficTotalBytes ?? 0;
    return {
      label: formatLabel(new Date(r.ts), mode),
      active: r.activeClients ?? 0,
      mb: Math.round(totalBytes / (1024 * 1024)),
    };
  });
}

export function buildFallbackOverviewResponse(opts: {
  from: Date; to: Date; grouping: Grouping;
  totals: { servers: number; clients: number; totalIn: number; totalOut: number; sessions: number };
}): OverviewSeriesResponse {
  const { from, to, grouping, totals } = opts;
  const start = new Date(from);
  const end   = new Date(to);
  const span  = end.getTime() - start.getTime();
  const dayMs = 24 * 3600 * 1000;

  const mode: Exclude<Grouping,"auto"> =
    grouping === "auto"
      ? (span <= 2 * dayMs ? "hours"
         : span <= 180 * dayMs ? "days"
         : span <= 36 * 30 * dayMs ? "months"
         : "years")
      : grouping;

  const baseMb = (totals.totalIn + totals.totalOut) / (1024 * 1024);
  const wave = (i: number, amp: number) =>
    Math.max(0, Math.round(amp + amp * 0.35 * Math.sin(i / 1.7) + (i % 3) - 1));

  const series: OverviewSeriesRowDto[] = [];

  if (mode === "hours") {
    const cur = new Date(start); cur.setMinutes(0,0,0); let i=0;
    while (cur <= end) {
      const active = wave(i, Math.max(4, totals.clients + 8));
      const mb = Math.round((baseMb / 300) * (1 + 0.15 * Math.cos(i / 2)) + active * 3);
      const total = mb * 1024 * 1024;
      series.push({
        ts: cur.toISOString(),
        activeClients: active,
        trafficInBytes: Math.floor(total * 0.6),
        trafficOutBytes: Math.ceil(total * 0.4),
        trafficTotalBytes: total,
      });
      cur.setHours(cur.getHours()+1); i++;
    }
  } else if (mode === "days") {
    const cur = new Date(start); cur.setHours(0,0,0,0); let i=0;
    while (cur <= end) {
      const active = wave(i, Math.max(6, totals.clients + 10));
      const mb = Math.round((baseMb / 90) * (1 + 0.15 * Math.cos(i / 2)) + active * 12);
      const total = mb * 1024 * 1024;
      series.push({
        ts: cur.toISOString(),
        activeClients: active,
        trafficInBytes: Math.floor(total * 0.6),
        trafficOutBytes: Math.ceil(total * 0.4),
        trafficTotalBytes: total,
      });
      cur.setDate(cur.getDate()+1); i++;
    }
  } else if (mode === "months") {
    let cur = new Date(start.getFullYear(), start.getMonth(), 1); let i=0;
    while (cur <= end) {
      const active = wave(i, Math.max(8, totals.clients + 14));
      const mb = Math.round((baseMb / 8) * (1 + 0.25 * Math.sin(i / 3)) + active * 40);
      const total = mb * 1024 * 1024;
      series.push({
        ts: cur.toISOString(),
        activeClients: active,
        trafficInBytes: Math.floor(total * 0.6),
        trafficOutBytes: Math.ceil(total * 0.4),
        trafficTotalBytes: total,
      });
      cur = new Date(cur.getFullYear(), cur.getMonth()+1, 1); i++;
    }
  } else {
    let year = start.getFullYear(); let i=0;
    while (year <= to.getFullYear()) {
      const active = wave(i, Math.max(10, totals.clients + 20));
      const mb = Math.round((baseMb / 1.6) * (1 + 0.3 * Math.cos(i / 2)) + active * 300);
      const total = mb * 1024 * 1024;
      series.push({
        ts: new Date(year, 0, 1).toISOString(),
        activeClients: active,
        trafficInBytes: Math.floor(total * 0.6),
        trafficOutBytes: Math.ceil(total * 0.4),
        trafficTotalBytes: total,
      });
      year++; i++;
    }
  }

  return {
    meta: {
      from: from.toISOString(),
      to: to.toISOString(),
      grouping: mode,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      trafficUnit: "bytes",
    },
    summary: {
      totalTrafficInBytes: totals.totalIn,
      totalTrafficOutBytes: totals.totalOut,
      peakActiveClients: Math.max(0, ...series.map(s => (s.activeClients ?? 0))),
    },
    series,
  };
}