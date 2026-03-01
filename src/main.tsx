import { createRoot } from "react-dom/client";
import "./index.css";
import "./css/buttons.css";
import "./css/tab.css";
import "./css/input.css";
import "./css/scrollbars.css";
import "./css/Login.css";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false;
        const name = error instanceof Error ? error.name : (error as { name?: string })?.name;
        const msg = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? "");
        if (name === "CanceledError" || msg === "canceled") return false;
        return true;
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <App />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
);