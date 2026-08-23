export type TopSlowItem = {
  key: string;
  label: string;
  maxDurationMs: number;
  samples: number;
};

export function stripQuery(path: string): string {
  const q = path.indexOf("?");
  return q >= 0 ? path.slice(0, q) : path;
}

/** Light pretty-print for EF/raw SQL (no dependency). Keeps already multi-line text. */
export function formatSqlForDisplay(sql: string): string {
  const trimmed = sql.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("\n") && trimmed.split("\n").length > 2) {
    return trimmed;
  }

  const keywords =
    /\b(SELECT DISTINCT|SELECT|INSERT INTO|DELETE FROM|UPDATE|SET|FROM|LEFT OUTER JOIN|RIGHT OUTER JOIN|FULL OUTER JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|CROSS JOIN|JOIN|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|UNION ALL|UNION|VALUES|AND|OR)\b/gi;

  return trimmed
    .replace(/\s+/g, " ")
    .replace(keywords, "\n$1")
    .replace(/^\n+/, "")
    .replace(/\n(AND|OR)\b/gi, "\n  $1")
    .trim();
}

export function buildTopSlow(
  items: { key: string; label: string; durationMs: number }[],
  take = 5,
): TopSlowItem[] {
  const map = new Map<string, TopSlowItem>();
  for (const item of items) {
    const existing = map.get(item.key);
    if (!existing) {
      map.set(item.key, {
        key: item.key,
        label: item.label,
        maxDurationMs: item.durationMs,
        samples: 1,
      });
      continue;
    }
    existing.samples += 1;
    if (item.durationMs > existing.maxDurationMs) {
      existing.maxDurationMs = item.durationMs;
      existing.label = item.label;
    }
  }
  return [...map.values()]
    .sort((a, b) => b.maxDurationMs - a.maxDurationMs)
    .slice(0, take);
}
