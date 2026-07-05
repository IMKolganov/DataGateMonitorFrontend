import type { GridFilterField } from "../components/ui/GridFilterBar";

/** Maps GridFilterBar local values to Orval query param objects (PascalCase keys). */
export function gridFilterToQueryParams(
  fields: GridFilterField[],
  values: Record<string, string>,
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};

  for (const field of fields) {
    if (!field.param) continue;
    const raw = (values[field.id] ?? "").trim();
    if (!raw) continue;

    if (field.type === "number") {
      const n = Number(raw);
      if (Number.isFinite(n)) params[field.param] = n;
      continue;
    }

    if (field.type === "select" && (raw === "true" || raw === "false")) {
      params[field.param] = raw === "true";
      continue;
    }

    params[field.param] = raw;
  }

  return params;
}
