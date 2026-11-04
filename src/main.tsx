import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./utils/auth/authSession.ts";
import { installDomTranslationGuard } from "./utils/domTranslationGuard";
import { installNativeDragGuard } from "./utils/nativeDragGuard";
import { installToastDefaults } from "./utils/installToastDefaults";
import { installMockAuth } from "./mocks/installMockAuth";
import "./index.css";
import "./css/ui-patterns.css";
import "./css/buttons.css";
import "./css/tab.css";
import "./css/input.css";
import "./css/scrollbars.css";
import "./css/Login.css";
import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { looksLikeChunkLoadError } from "./utils/chunkLoadError";

installMockAuth();
installDomTranslationGuard();
installNativeDragGuard();
installToastDefaults();
const CHUNK_RELOAD_KEY = "chunk-reload:last-attempt-ms";
const CHUNK_RELOAD_COOLDOWN_MS = 30_000;
const CHUNK_RELOAD_OVERLAY_ID = "chunk-reload-overlay";

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
  // If navigation is blocked, do not leave a permanent click-blocking layer.
  window.setTimeout(() => {
    document.getElementById(CHUNK_RELOAD_OVERLAY_ID)?.remove();
  }, 5_000);
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
  overlay.style.cursor = "wait";

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

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <App />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);