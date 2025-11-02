import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./css/buttons.css";
import "./css/tab.css";
import "./css/input.css";
import "./css/scrollbars.css";
import App from "./App.tsx";

// ⬇️ React Query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* optional devtools */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);