import { useCallback, useEffect, useMemo, useState } from "react";
import { emptyGridFilterValues } from "../components/ui/GridFilterBar";
import { gridFilterFields, type GridFilterId } from "../config/gridFilters";
import { gridFilterToQueryParams } from "../utils/gridFilterParams";

export type GridFilterBarBind = {
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  onReset: () => void;
  onApply: () => void;
  /** Applied filter values mapped to Orval query params */
  queryParams: Record<string, string | number | boolean>;
};

export function useGridFilters(gridId: GridFilterId): GridFilterBarBind {
  const fields = useMemo(() => gridFilterFields(gridId), [gridId]);
  const empty = useMemo(() => emptyGridFilterValues(fields), [fields]);

  const [values, setValues] = useState(empty);
  const [applied, setApplied] = useState(empty);

  useEffect(() => {
    setValues(empty);
    setApplied(empty);
  }, [gridId, empty]);

  const resetState = useCallback(() => {
    setValues(empty);
    setApplied(empty);
  }, [empty]);

  const onChange = useCallback((id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const onReset = useCallback(() => {
    resetState();
  }, [resetState]);

  const onApply = useCallback(() => {
    setApplied({ ...values });
  }, [values]);

  const queryParams = useMemo(
    () => gridFilterToQueryParams(fields, applied),
    [fields, applied],
  );

  return { values, onChange, onReset, onApply, queryParams };
}

/** @deprecated Use `useGridFilters` */
export const useGridFilterStub = useGridFilters;
