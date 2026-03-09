import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import type { DataGridProps } from "@mui/x-data-grid";
import { styled } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";
import GridToolbarWithExcelClipboard from "./GridToolbarWithExcelClipboard";

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
      ...scrollbarStyles,
    },
    "& .MuiDataGrid-scrollbar": {
      background: scrollbarTrack,
      ...scrollbarStyles,
    },
  };
});

/**
 * Data grid with toolbar (Columns button) and column menu enabled.
 * Use this as the default grid so users get horizontal scroll, column visibility, and column menu.
 */
const AppDataGrid = React.forwardRef<HTMLDivElement, DataGridProps>(function AppDataGrid(props, ref) {
  return (
    <StyledDataGrid
      ref={ref}
      showToolbar
      slots={{ toolbar: GridToolbarWithExcelClipboard }}
      {...props}
    />
  );
});

export default AppDataGrid;
export { StyledDataGrid };
