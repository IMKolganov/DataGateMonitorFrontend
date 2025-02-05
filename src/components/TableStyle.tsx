import React, { ReactNode } from "react";
import { ThemeProvider, createTheme, styled } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";

const githubDarkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0d1117",
      paper: "#161b22",
    },
    text: {
      primary: "#c9d1d9",
      secondary: "#8b949e",
    },
  },
});

export const StyledDataGrid = styled(DataGrid)({
  fontFamily: "monospace",
  border: "none",
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#161b22",
    color: "#c9d1d9",
    fontSize: "14px",
    fontWeight: "bold",
    borderBottom: "1px solid #30363d",
  },
  "& .MuiDataGrid-cell": {
    color: "#c9d1d9",
    borderBottom: "1px solid #30363d",
  },
  "& .MuiDataGrid-row": {
    backgroundColor: "#0d1117",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "#21262d",
  },
  "& .MuiDataGrid-footerContainer": {
    backgroundColor: "#161b22",
    color: "#c9d1d9",
    borderTop: "1px solid #30363d",
  },
});

interface TableStyleProps {
  children: ReactNode;
}

const TableStyle: React.FC<TableStyleProps> = ({ children }) => {
  return (
    <ThemeProvider theme={githubDarkTheme}>
      <div
        style={{
          height: 500,
          width: "100%",
          backgroundColor: "#0d1117",
          padding: "10px",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </ThemeProvider>
  );
};

export default TableStyle;
