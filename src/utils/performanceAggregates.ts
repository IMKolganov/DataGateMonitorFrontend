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
