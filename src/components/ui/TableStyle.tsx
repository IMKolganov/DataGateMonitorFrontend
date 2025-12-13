import { DataGrid } from "@mui/x-data-grid";
import { styled } from "@mui/material/styles";

const StyledDataGrid = styled(DataGrid)({
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
  "& .MuiDataGrid-root": {
    overflow: "hidden",
  },
  "& .MuiDataGrid-virtualScroller": {
    overflowX: "hidden",
    overflowY: "auto",
    scrollbarWidth: "thin",
    scrollbarColor: "#30363d #0d1117",
    "&::-webkit-scrollbar": {
      width: "8px",
      height: "8px",
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "#0d1117",
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "#30363d",
      borderRadius: "4px",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      backgroundColor: "#484f58",
    },
  },
  "& .MuiDataGrid-scrollbar": {
    display: "none",
  },
});

export default StyledDataGrid;
