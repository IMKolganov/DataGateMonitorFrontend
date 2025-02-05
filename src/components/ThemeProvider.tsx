import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ReactNode } from "react";

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

interface ThemeProps {
  children: ReactNode;
}

const CustomThemeProvider: React.FC<ThemeProps> = ({ children }) => {
  return <ThemeProvider theme={githubDarkTheme}>{children}</ThemeProvider>;
};

export default CustomThemeProvider;
