import React, { useMemo } from "react";
import { ThemeProvider as MuiThemeProvider, createTheme } from "@mui/material/styles";
import type { ReactNode } from "react";
import type {} from "@mui/x-data-grid/themeAugmentation";
import { useTheme } from "../../contexts/ThemeContext";

const darkPalette = {
  mode: "dark" as const,
  background: {
    default: "#0d1117",
    paper: "#161b22",
  },
  text: {
    primary: "#c9d1d9",
    secondary: "#8b949e",
  },
  DataGrid: {
    bg: "#0d1117",
    headerBg: "#161b22",
    pinnedBg: "#161b22",
  },
};

const lightPalette = {
  mode: "light" as const,
  background: {
    default: "#f6f8fa",
    paper: "#ffffff",
  },
  text: {
    primary: "#1f2328",
    secondary: "#424a53",
  },
  DataGrid: {
    bg: "#f6f8fa",
    headerBg: "#ffffff",
    pinnedBg: "#eaeef2",
  },
};

function getAppTheme(mode: "light" | "dark") {
  return createTheme({
    palette: mode === "dark" ? darkPalette : lightPalette,
  });
}

interface ThemeProps {
  children: ReactNode;
}

const CustomThemeProvider: React.FC<ThemeProps> = ({ children }) => {
  const { theme } = useTheme();
  const muiTheme = useMemo(() => getAppTheme(theme), [theme]);
  return <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>;
};

export default CustomThemeProvider;
