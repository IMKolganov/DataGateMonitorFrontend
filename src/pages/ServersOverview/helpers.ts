import type { Grouping } from "../../components/DateRangeFilter";
import type { ChartPoint, UsersSeriesChartPoint, MergedChartPoint } from "./types";
import type {
  OverviewSeriesResponse,
  OverviewSeriesRowDto,
} from "../../api/orvalModelShim";
import type { OverviewUsersSeriesRowDto } from "../../api/orvalModelShim";

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

export type NormalizedGrouping = "tenminutes" | "hours" | "days" | "months" | "years";

export function normalizeGrouping(g: string | null | undefined): NormalizedGrouping {
  switch (g) {
    case "tenminutes":
    case "hours":
    case "days":
    case "months":
    case "years":
      return g;
    default:
      return "days";
  }
}

export function formatLabel(d: Date, mode: Exclude<Grouping,"auto">): string {
  if (mode === "tenminutes")
    return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
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
  mode: Exclude<Grouping, "auto">
): ChartPoint[] {
  return rows
    // type guard: keep only rows with a valid ts
    .filter((r): r is OverviewSeriesRowDto & { ts: string } => typeof r.ts === "string" && r.ts.length > 0)
    .map((r) => {
      // fallback if server didn't precompute total
      const totalBytes =
        r.trafficTotalBytes ?? ((r.trafficInBytes ?? 0) + (r.trafficOutBytes ?? 0));

      const date = new Date(r.ts); // ts is guaranteed here

      return {
        label: formatLabel(date, mode),
        active: r.activeClients ?? 0,
        mb: Math.round(totalBytes / (1024 * 1024)),
      };
    });
}

export function toUsersSeriesChartPoints(
  rows: OverviewUsersSeriesRowDto[],
  mode: Exclude<Grouping, "auto">
): UsersSeriesChartPoint[] {
  return (rows ?? [])
    .filter((r): r is OverviewUsersSeriesRowDto & { ts: string } => typeof r.ts === "string" && r.ts.length > 0)
    .map((r) => {
      const date = new Date(r.ts);
      return {
        label: formatLabel(date, mode),
        activeSessions: r.activeSessions ?? 0,
        activeUsers: r.activeUsers ?? 0,
      };
    });
}

/** Merge main chart points with users series by index (same From/To/Grouping → same order). Adds activeUsers. */
export function mergeChartWithUsersSeries(
  base: ChartPoint[],
  usersSeries: UsersSeriesChartPoint[]
): MergedChartPoint[] {
  return base.map((p, i) => ({
    ...p,
    activeUsers: usersSeries[i]?.activeUsers ?? 0,
  }));
}

/** Peak / trough of a concurrent metric over series buckets (with bucket start time). */
export type SeriesExtreme = {
  count: number;
  at: Date;
  atLabel: string;
};

export type SeriesExtremes = {
  peak: SeriesExtreme | null;
  low: SeriesExtreme | null;
};

/**
 * Peak and low concurrent values for the selected period.
 * Prefer API summary fields (sampled buckets only). This helper is a fallback and
 * still skips future buckets, but Min over chart rows can hit zero-filled gaps.
 */
export function computeSeriesExtremes(
  rows: ReadonlyArray<{ ts?: string | null; value?: number | null }>,
  mode: Exclude<Grouping, "auto">,
  now: Date = new Date()
): SeriesExtremes {
  const nowMs = now.getTime();
  const points: { at: Date; value: number }[] = [];

  for (const row of rows ?? []) {
    if (typeof row.ts !== "string" || row.ts.length === 0) continue;
    const at = new Date(row.ts);
    const atMs = at.getTime();
    if (!Number.isFinite(atMs) || atMs > nowMs) continue;
    const value = Number(row.value ?? 0);
    if (!Number.isFinite(value)) continue;
    points.push({ at, value });
  }

  if (points.length === 0) return { peak: null, low: null };

  let peak = points[0];
  let low = points[0];
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.value > peak.value) peak = p;
    if (p.value < low.value) low = p;
  }

  return {
    peak: { count: peak.value, at: peak.at, atLabel: formatLabel(peak.at, mode) },
    low: { count: low.value, at: low.at, atLabel: formatLabel(low.at, mode) },
  };
}

/** Build a UI extreme from API summary count + bucket timestamp. */
export function extremeFromSummary(
  count: number | null | undefined,
  atIso: string | null | undefined,
  mode: Exclude<Grouping, "auto">
): SeriesExtreme | null {
  if (count == null || !Number.isFinite(count)) return null;
  if (typeof atIso !== "string" || atIso.length === 0) return null;
  const at = new Date(atIso);
  if (!Number.isFinite(at.getTime())) return null;
  return { count, at, atLabel: formatLabel(at, mode) };
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
      ? (span <= 24 * 3600 * 1000 ? "tenminutes"
         : span <= 2 * dayMs ? "hours"
         : span <= 180 * dayMs ? "days"
         : span <= 36 * 30 * dayMs ? "months"
         : "years")
      : grouping;

  const baseMb = (totals.totalIn + totals.totalOut) / (1024 * 1024);
  const wave = (i: number, amp: number) =>
    Math.max(0, Math.round(amp + amp * 0.35 * Math.sin(i / 1.7) + (i % 3) - 1));

  const overviewSeriesRows: OverviewSeriesRowDto[] = [];

  if (mode === "tenminutes") {
    const cur = new Date(start);
    cur.setSeconds(0, 0);
    cur.setMinutes(cur.getMinutes() - (cur.getMinutes() % 10));
    let i = 0;
    while (cur <= end) {
      const active = wave(i, Math.max(4, totals.clients + 8));
      const mb = Math.round((baseMb / 1800) * (1 + 0.15 * Math.cos(i / 2)) + active * 0.5);
      const total = mb * 1024 * 1024;
      overviewSeriesRows.push({
        ts: cur.toISOString(),
        activeClients: active,
        trafficInBytes: Math.floor(total * 0.6),
        trafficOutBytes: Math.ceil(total * 0.4),
        trafficTotalBytes: total,
      });
      cur.setMinutes(cur.getMinutes() + 10);
      i++;
    }
  } else if (mode === "hours") {
    const cur = new Date(start); cur.setMinutes(0,0,0); let i=0;
    while (cur <= end) {
      const active = wave(i, Math.max(4, totals.clients + 8));
      const mb = Math.round((baseMb / 300) * (1 + 0.15 * Math.cos(i / 2)) + active * 3);
      const total = mb * 1024 * 1024;
      overviewSeriesRows.push({
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
      overviewSeriesRows.push({
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
      overviewSeriesRows.push({
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
      overviewSeriesRows.push({
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
      peakActiveClients: Math.max(0, ...overviewSeriesRows.map(s => (s.activeClients ?? 0))),
    },
    overviewSeriesRows,
  };
}