import { createRoot } from "react-dom/client";
import "./utils/auth/authSession.ts";
import "./index.css";
import "./css/ui-patterns.css";
import "./css/buttons.css";
import "./css/tab.css";
import "./css/input.css";
import "./css/scrollbars.css";
import "./css/Login.css";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const CHUNK_RELOAD_KEY = "chunk-reload:last-attempt-ms";
const CHUNK_RELOAD_COOLDOWN_MS = 30_000;
const CHUNK_RELOAD_OVERLAY_ID = "chunk-reload-overlay";

function looksLikeChunkLoadError(reason: unknown): boolean {
  const text =
    reason instanceof Error
      ? `${reason.name} ${reason.message}`
      : typeof reason === "string"
      ? reason
      : String(reason ?? "");

  return (
    /ChunkLoadError/i.test(text) ||
    /Loading chunk [\d]+ failed/i.test(text) ||
    /Failed to fetch dynamically imported module/i.test(text)
  );
}

function tryReloadOnChunkError(trigger: unknown): void {
  if (!looksLikeChunkLoadError(trigger)) return;

  const now = Date.now();
  const lastRaw = sessionStorage.getItem(CHUNK_RELOAD_KEY);
  const last = lastRaw ? Number.parseInt(lastRaw, 10) : 0;
  if (Number.isFinite(last) && now - last < CHUNK_RELOAD_COOLDOWN_MS) {
    // Avoid reload loops on genuinely broken deployments.
    return;
  }

  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  showReloadOverlay();
  window.setTimeout(() => window.location.reload(), 450);
}

function showReloadOverlay(): void {
  if (document.getElementById(CHUNK_RELOAD_OVERLAY_ID)) return;

  const overlay = document.createElement("div");
  overlay.id = CHUNK_RELOAD_OVERLAY_ID;
  overlay.textContent = "A new version is available. Reloading...";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(13,17,23,0.94)";
  overlay.style.color = "#f0f6fc";
  overlay.style.fontSize = "16px";
  overlay.style.fontWeight = "600";
  overlay.style.zIndex = "2147483647";
  overlay.style.padding = "16px";
  overlay.style.textAlign = "center";

  document.body.appendChild(overlay);
}

window.addEventListener("error", (event) => {
  tryReloadOnChunkError(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  tryReloadOnChunkError(event.reason);
});

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