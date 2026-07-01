import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import type { DataGridProps, GridCallbackDetails, GridColumnResizeParams } from "@mui/x-data-grid";
import { styled } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";
import GridToolbarWithExcelClipboard from "./GridToolbarWithExcelClipboard";
import {
  applyStoredColumnWidths,
  getStoredColumnWidths,
  setStoredColumnWidth,
} from "../../utils/gridColumnWidths";

const borderColorDark = "#30363d";
const borderColorLight = "#d0d7de";

const StyledDataGrid = styled(DataGrid)(({ theme }) => {
  const palette = theme.palette as typeof theme.palette & {
    DataGrid?: {
      bg?: string;
      headerBg?: string;
      pinnedBg?: string;
      scrollbarTrack?: string;
      scrollbarThumb?: string;
      scrollbarThumbHover?: string;
    };
  };
  const isDark = theme.palette.mode === "dark";
  const borderColor = isDark ? borderColorDark : borderColorLight;
  const headerBg = palette.DataGrid?.headerBg ?? (isDark ? "#161b22" : "#ffffff");
  const rowBg = palette.DataGrid?.bg ?? (isDark ? "#0d1117" : "#f6f8fa");
  const rowHoverBg = isDark ? "#21262d" : "#eaeef2";
  const footerBg = palette.DataGrid?.headerBg ?? (isDark ? "#161b22" : "#ffffff");

  const scrollbarTrack =
    palette.DataGrid?.scrollbarTrack ?? (isDark ? "#161b22" : "#eaeef2");
  const scrollbarThumb =
    palette.DataGrid?.scrollbarThumb ?? (isDark ? "#30363d" : "#d0d7de");
  const scrollbarThumbHover =
    palette.DataGrid?.scrollbarThumbHover ?? (isDark ? "#484f58" : "#8b949e");

  const scrollbarStyles = {
    scrollbarWidth: "thin" as const,
    scrollbarColor: `${scrollbarThumb} ${scrollbarTrack}`,
    "&::-webkit-scrollbar": { height: 8, width: 8 },
    "&::-webkit-scrollbar-track": { background: scrollbarTrack },
    "&::-webkit-scrollbar-thumb": {
      background: scrollbarThumb,
      borderRadius: 4,
    },
    "&::-webkit-scrollbar-thumb:hover": { background: scrollbarThumbHover },
  };

  return {
    fontFamily: "monospace",
    border: "none",
    "& .MuiDataGrid-columnHeaders": {
      backgroundColor: headerBg,
      fontSize: "14px",
      fontWeight: "bold",
      borderBottom: `1px solid ${borderColor}`,
    },
    "& .MuiDataGrid-cell": {
      borderBottom: `1px solid ${borderColor}`,
      display: "flex",
      alignItems: "center",
    },
    /* Boolean “false” uses SvgIcon color=disabled; ensure contrast on dark rows */
    "& .MuiDataGrid-booleanCell": {
      color: theme.palette.text.secondary,
      opacity: 1,
    },
    "& .MuiDataGrid-row": {
      backgroundColor: rowBg,
    },
    "& .MuiDataGrid-row:hover": {
      backgroundColor: rowHoverBg,
    },
    "& .MuiDataGrid-footerContainer": {
      backgroundColor: footerBg,
      borderTop: `1px solid ${borderColor}`,
    },
    "& .MuiDataGrid-root": {
      overflow: "visible",
    },
    "& .MuiDataGrid-virtualScroller": {
      overflowX: "auto",
      overflowY: "auto",
      scrollbarGutter: "auto",
      ...scrollbarStyles,
    },
    "& .MuiDataGrid-scrollbar--horizontal, & .MuiDataGrid-scrollbar--vertical": {
      backgroundColor: scrollbarTrack,
      scrollbarWidth: "thin",
      scrollbarColor: `${scrollbarThumb} ${scrollbarTrack}`,
    },
    "& .MuiDataGrid-scrollbar--horizontal::-webkit-scrollbar": {
      height: 8,
    },
    "& .MuiDataGrid-scrollbar--vertical::-webkit-scrollbar": {
      width: 8,
    },
    "& .MuiDataGrid-scrollbar--horizontal::-webkit-scrollbar-track, & .MuiDataGrid-scrollbar--vertical::-webkit-scrollbar-track": {
      background: scrollbarTrack,
    },
    "& .MuiDataGrid-scrollbar--horizontal::-webkit-scrollbar-thumb, & .MuiDataGrid-scrollbar--vertical::-webkit-scrollbar-thumb": {
      background: scrollbarThumb,
      borderRadius: 4,
    },
    "& .MuiDataGrid-scrollbar--horizontal::-webkit-scrollbar-thumb:hover, & .MuiDataGrid-scrollbar--vertical::-webkit-scrollbar-thumb:hover": {
      background: scrollbarThumbHover,
    },
  };
});

export type GridProps = DataGridProps & {
  /** Stable id for persisting column widths per user. */
  gridId: string;
};

/**
 * Base data grid for the app: shared styling, toolbar, and per-user column width persistence.
 * All table grids should use this component (not MUI DataGrid or StyledDataGrid directly).
 */
const Grid = React.forwardRef<HTMLDivElement, GridProps>(function Grid(props, ref) {
  const { autoHeight, gridId, columns, onColumnWidthChange, slots, ...rest } = props;

  const [columnWidths, setColumnWidths] = useState(() => getStoredColumnWidths(gridId));

  useEffect(() => {
    setColumnWidths(getStoredColumnWidths(gridId));
  }, [gridId]);

  const mergedColumns = useMemo(
    () => applyStoredColumnWidths(columns ?? [], columnWidths),
    [columns, columnWidths],
  );

  const handleColumnWidthChange = useCallback(
    (
      params: GridColumnResizeParams,
      event: Parameters<NonNullable<DataGridProps["onColumnWidthChange"]>>[1],
      details: GridCallbackDetails,
    ) => {
      const field = params.colDef.field;
      const width = params.width;
      if (field && Number.isFinite(width) && width > 0) {
        setColumnWidths((prev) => {
          const next = { ...prev, [field]: width };
          setStoredColumnWidth(gridId, field, width);
          return next;
        });
      }
      onColumnWidthChange?.(params, event, details);
    },
    [gridId, onColumnWidthChange],
  );

  return (
    <StyledDataGrid
      ref={ref}
      autoHeight={autoHeight ?? true}
      showToolbar
      slots={{ toolbar: GridToolbarWithExcelClipboard, ...slots }}
      columns={mergedColumns}
      onColumnWidthChange={handleColumnWidthChange}
      {...rest}
    />
  );
});

export default Grid;
