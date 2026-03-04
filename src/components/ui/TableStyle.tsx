import { DataGrid } from "@mui/x-data-grid";
import { styled } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";

const borderColorDark = "#30363d";
const borderColorLight = "#d0d7de";

const StyledDataGrid = styled(DataGrid)(({ theme }) => {
  const palette = theme.palette as typeof theme.palette & {
    DataGrid?: { bg?: string; headerBg?: string; pinnedBg?: string };
  };
  const isDark = theme.palette.mode === "dark";
  const borderColor = isDark ? borderColorDark : borderColorLight;
  const headerBg = palette.DataGrid?.headerBg ?? (isDark ? "#161b22" : "#ffffff");
  const rowBg = palette.DataGrid?.bg ?? (isDark ? "#0d1117" : "#f6f8fa");
  const rowHoverBg = isDark ? "#21262d" : "#eaeef2";
  const footerBg = palette.DataGrid?.headerBg ?? (isDark ? "#161b22" : "#ffffff");

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
      overflow: "hidden",
    },
    "& .MuiDataGrid-virtualScroller": {
      overflowX: "hidden",
      overflowY: "auto",
      scrollbarWidth: "thin",
    },
    "& .MuiDataGrid-scrollbar": {
      display: "none",
    },
  };
});

export default StyledDataGrid;
