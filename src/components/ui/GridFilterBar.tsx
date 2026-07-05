import React from "react";
import "../../css/GridFilterBar.css";

export type GridFilterField = {
  /** Local state key in the parent hook */
  id: string;
  label: string;
  placeholder?: string;
  /** Query param name on the backend (Orval) once swagger is regenerated */
  param?: string;
  type?: "text" | "number" | "select";
  options?: { value: string; label: string }[];
};

export type GridFilterBarProps = {
  /** e.g. "settings-users" — see src/config/gridFilters.ts */
  gridId: string;
  fields: GridFilterField[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  onApply?: () => void;
  onReset?: () => void;
  /** When true, shows a hint that API wiring is pending */
  pendingOrval?: boolean;
  disabled?: boolean;
};

/**
 * Shared filter toolbar for MUI DataGrids.
 * Backend query params are defined in gridFilters.ts; wire hooks after `npm run gen:api`.
 */
export const GridFilterBar: React.FC<GridFilterBarProps> = ({
  gridId,
  fields,
  values,
  onChange,
  onApply,
  onReset,
  pendingOrval = false,
  disabled = false,
}) => {
  if (fields.length === 0)
    return null;

  return (
    <div className="grid-filter-bar" data-grid-id={gridId}>
      {pendingOrval && (
        <p className="grid-filter-bar__hint">
          Filters UI ready — connect to API after SharedModels publish and <code>npm run gen:api</code>.
        </p>
      )}
      <div className="grid-filter-bar__fields">
        {fields.map((field) => (
          <label key={field.id} className="grid-filter-bar__field">
            <span className="grid-filter-bar__label">{field.label}</span>
            {field.type === "select" && field.options ? (
              <select
                className="grid-filter-bar__input"
                value={values[field.id] ?? ""}
                disabled={disabled}
                onChange={(e) => onChange(field.id, e.target.value)}
              >
                <option value="">All</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="grid-filter-bar__input"
                type={field.type === "number" ? "number" : "text"}
                placeholder={field.placeholder ?? field.label}
                value={values[field.id] ?? ""}
                disabled={disabled}
                onChange={(e) => onChange(field.id, e.target.value)}
              />
            )}
          </label>
        ))}
      </div>
      {(onApply || onReset) && (
        <div className="grid-filter-bar__actions">
          {onApply && (
            <button type="button" className="grid-filter-bar__btn" disabled={disabled} onClick={onApply}>
              Apply
            </button>
          )}
          {onReset && (
            <button type="button" className="grid-filter-bar__btn grid-filter-bar__btn--secondary" disabled={disabled} onClick={onReset}>
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/** Hook helper: empty filter state from field definitions */
export function emptyGridFilterValues(fields: GridFilterField[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f.id, ""]));
}
