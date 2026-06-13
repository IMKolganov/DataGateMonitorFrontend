// src/components/DateRangeFilter.tsx
import React, { useMemo } from "react";
import { FaCheck, FaUndo } from "react-icons/fa";

export type Grouping = "auto" | "hours" | "days" | "months" | "years";

export type DateRangeChange = {
  from: Date;
  to: Date;
  grouping: Grouping;
};

type Props = {
  from: Date;
  to: Date;
  grouping: Grouping;
  onChange: (c: DateRangeChange) => void;
};

type PresetId =
  | "24h"
  | "7d"
  | "30d"
  | "last2m"
  | "last3m"
  | "last6m"
  | "thisMonth"
  | "lastMonth"
  | "ytd"
  | "1y"
  | "2y"
  | "3y";

const PRESETS: { id: PresetId; label: string }[] = [
  { id: "24h", label: "Last 24h" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "last2m", label: "Last 2 months" },
  { id: "last3m", label: "Last 3 months" },
  { id: "last6m", label: "Last 6 months" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "ytd", label: "YTD" },
  { id: "1y", label: "Last year" },
  { id: "2y", label: "Last 2 years" },
  { id: "3y", label: "Last 3 years" },
];

export default function DateRangeFilter({ from, to, grouping, onChange }: Props) {
  const isInvalid = from > to;

  function applyPreset(p: PresetId) {
    const now = new Date();
    if (p === "24h") {
      const f = new Date(now.getTime() - 24 * 3600 * 1000);
      onChange({ from: f, to: now, grouping: "auto" });
      return;
    }
    if (p === "7d") {
      const s = startOfToday();
      const f = addDays(s, -6);
      onChange({ from: f, to: endOfToday(), grouping: "auto" });
      return;
    }
    if (p === "30d") {
      const s = startOfToday();
      const f = addDays(s, -29);
      onChange({ from: f, to: endOfToday(), grouping: "auto" });
      return;
    }
    if (p === "last2m") {
      onChange({ from: addMonths(startOfToday(), -2), to: endOfToday(), grouping: "auto" });
      return;
    }
    if (p === "last3m") {
      onChange({ from: addMonths(startOfToday(), -3), to: endOfToday(), grouping: "auto" });
      return;
    }
    if (p === "last6m") {
      onChange({ from: addMonths(startOfToday(), -6), to: endOfToday(), grouping: "auto" });
      return;
    }
    if (p === "thisMonth") {
      const s = startOfMonth(now);
      const e = endOfMonth(now);
      onChange({ from: s, to: e, grouping: "auto" });
      return;
    }
    if (p === "lastMonth") {
      const s = startOfMonth(addMonths(now, -1));
      const e = endOfMonth(addMonths(now, -1));
      onChange({ from: s, to: e, grouping: "auto" });
      return;
    }
    if (p === "ytd") {
      const s = new Date(now.getFullYear(), 0, 1);
      onChange({ from: s, to: now, grouping: "auto" });
      return;
    }
    if (p === "1y") {
      onChange({ from: addYears(now, -1), to: now, grouping: "auto" });
      return;
    }
    if (p === "2y") {
      onChange({ from: addYears(now, -2), to: now, grouping: "auto" });
      return;
    }
    if (p === "3y") {
      onChange({ from: addYears(now, -3), to: now, grouping: "auto" });
      return;
    }
  }

  const activePresetId = useMemo(() => detectActivePreset(from, to), [from, to]);

  return (
    <div
      style={{
        border: "1px solid var(--border-color)",
        borderRadius: 12,
        background: "var(--bg-body)",
        padding: 12,
        marginBottom: 12,
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 10,
      }}
    >
      {/* Presets row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p.id)}
            className="btn secondary"
            style={{
              color: activePresetId === p.id ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: activePresetId === p.id ? "0 0 0 3px rgba(255, 255, 255, 0.25)" : "none",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Inputs row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 10,
          alignItems: "center",
        }}
      >
        <Labeled field="From" fieldId="date-range-from">
          <input
            id="date-range-from"
            name="dateRangeFrom"
            type="date"
            value={toDateInputValue(from)}
            onChange={(e) => {
              const d = new Date(e.target.value);
              const f = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
              onChange({ from: f, to, grouping });
            }}
            style={dateInputStyle}
          />
        </Labeled>

        <Labeled field="To" fieldId="date-range-to">
          <input
            id="date-range-to"
            name="dateRangeTo"
            type="date"
            value={toDateInputValue(to)}
            onChange={(e) => {
              const d = new Date(e.target.value);
              const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
              onChange({ from, to: t, grouping });
            }}
            style={dateInputStyle}
          />
        </Labeled>

        <Labeled field="Grouping" fieldId="date-range-grouping">
          <select
            id="date-range-grouping"
            name="dateRangeGrouping"
            value={grouping}
            onChange={(e) => onChange({ from, to, grouping: e.target.value as Grouping })}
            style={selectStyle}
          >
            <option value="auto">Auto</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
            <option value="months">Months</option>
            <option value="years">Years</option>
          </select>
        </Labeled>
      </div>

      {/* Footer row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {isInvalid ? (
          <span style={{ color: "#ffa657", fontSize: 12, fontWeight: 700 }}>
            From must be before To.
          </span>
        ) : (
          <span style={{ opacity: 0.75, fontSize: 12 }}>
            Showing: {from.toLocaleDateString()} — {to.toLocaleDateString()}
          </span>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <OutlineBtn onClick={() => onChange({ from: defaultFrom(), to: defaultTo(), grouping: "auto" })}>
            <FaUndo className="icon" aria-hidden /> Reset
          </OutlineBtn>
          <PrimaryBtn onClick={() => onChange({ from, to, grouping })}>
            <FaCheck className="icon" aria-hidden /> Apply
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

/* ---------- small UI ---------- */

function Labeled({
  field,
  fieldId,
  children,
}: {
  field: string;
  fieldId: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={fieldId} style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.8 }}>{field}</span>
      {children}
    </label>
  );
}

const baseInput: React.CSSProperties = {
  padding: "8px 10px",
  background: "var(--bg-body)",
  color: "var(--text-secondary)",
  border: "1px solid var(--border-color)",
  borderRadius: 10,
  fontWeight: 600,
  outline: "none",
};

const dateInputStyle: React.CSSProperties = {
  ...baseInput,
  boxShadow: "inset 0 0 0 1px transparent",
};

const selectStyle: React.CSSProperties = {
  ...baseInput,
  appearance: "none",
};

function OutlineBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="btn secondary"
    >
      {children}
    </button>
  );
}

function PrimaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="btn primary"
    >
      {children}
    </button>
  );
}

/* ---------- helpers ---------- */

function toDateInputValue(d: Date) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
function startOfToday() {
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  return n;
}
function endOfToday() {
  const n = new Date();
  n.setHours(23, 59, 59, 999);
  return n;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}
function addYears(d: Date, n: number) {
  return new Date(d.getFullYear() + n, d.getMonth(), d.getDate());
}

/* default reset targets for the Reset button */
function defaultFrom() {
  return addDays(startOfToday(), -6);
}
function defaultTo() {
  return endOfToday();
}

/* detect which preset is currently active (for highlighting) */
function detectActivePreset(from: Date, to: Date): PresetId | null {
  const now = new Date();

  // helpers
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  // 24h
  const d24 = new Date(now.getTime() - 24 * 3600 * 1000);
  if (Math.abs(from.getTime() - d24.getTime()) < 60 * 1000 && Math.abs(to.getTime() - now.getTime()) < 60 * 1000)
    return "24h";

  // 7d
  const s7 = addDays(startOfToday(), -6);
  if (sameDay(from, s7) && sameDay(to, startOfToday()))
    return "7d";

  // 30d
  const s30 = addDays(startOfToday(), -29);
  if (sameDay(from, s30) && sameDay(to, startOfToday()))
    return "30d";

  // last 2 / 3 months (from same calendar day N months ago, through end of today)
  const from2m = addMonths(startOfToday(), -2);
  if (sameDay(from, from2m) && sameDay(to, endOfToday()))
    return "last2m";
  const from3m = addMonths(startOfToday(), -3);
  if (sameDay(from, from3m) && sameDay(to, endOfToday()))
    return "last3m";
  const from6m = addMonths(startOfToday(), -6);
  if (sameDay(from, from6m) && sameDay(to, endOfToday()))
    return "last6m";

  // thisMonth
  if (sameDay(from, startOfMonth(now)) && sameDay(to, endOfMonth(now)))
    return "thisMonth";

  // lastMonth
  const lastStart = startOfMonth(addMonths(now, -1));
  const lastEnd = endOfMonth(addMonths(now, -1));
  if (sameDay(from, lastStart) && sameDay(to, lastEnd))
    return "lastMonth";

  // ytd
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  if (sameDay(from, ytdStart) && sameDay(to, startOfToday()))
    return "ytd";

  // 1y
  const y1 = addYears(now, -1);
  if (from.toDateString() === y1.toDateString() && to.toDateString() === now.toDateString())
    return "1y";

  // 2y
  const y2 = addYears(now, -2);
  if (from.toDateString() === y2.toDateString() && to.toDateString() === now.toDateString())
    return "2y";

  // 3y
  const y3 = addYears(now, -3);
  if (from.toDateString() === y3.toDateString() && to.toDateString() === now.toDateString())
    return "3y";

  return null;
}
