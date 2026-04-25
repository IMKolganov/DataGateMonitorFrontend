// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "fs";
import https from "https";
import { visualizer } from "rollup-plugin-visualizer";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));

function normalizeProxyBase(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "https://api.datagateapp.com/";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function toProxyOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "https://api.datagateapp.com";
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyBase = normalizeProxyBase(env.VITE_PROXY_TARGET ?? "https://api.datagateapp.com/");
  const proxyTarget = toProxyOrigin(proxyBase);
  const httpsIpv4Agent = new https.Agent({ family: 4, keepAlive: true });
  const port = Number.parseInt(env.VITE_PORT || "", 10) || 5582;

  const isDev = mode === "development";
  const signalrDevOrigin = new URL(proxyTarget).origin;

  return {
    plugins: [
      tailwindcss(),
      react(),
      visualizer({
        filename: "dist/stats.html",
        template: "treemap",
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
    ],

    server: {
      port,
      proxy: {
        "/api/hubs": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          agent: httpsIpv4Agent,
          proxyTimeout: 15000,
          timeout: 15000,
        },
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: false,
          agent: httpsIpv4Agent,
          proxyTimeout: 15000,
          timeout: 15000,
        },
      },
    },

    preview: {
      port,
      proxy: {
        "/api/hubs": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          agent: httpsIpv4Agent,
          proxyTimeout: 15000,
          timeout: 15000,
        },
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: false,
          agent: httpsIpv4Agent,
          proxyTimeout: 15000,
          timeout: 15000,
        },
      },
    },

    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      /** Injected only in dev build; status-stream connects here to bypass Vite WS proxy. */
      __VITE_SIGNALR_DEV_ORIGIN__: JSON.stringify(isDev ? signalrDevOrigin : ""),
      /** Injected only in dev build; browser API client can call backend directly if Vite proxy is unstable. */
      __VITE_API_DEV_ORIGIN__: JSON.stringify(isDev ? proxyTarget : ""),
    },

    build: {
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1200,
      /** Suppress Rolldown’s PLUGIN_TIMINGS noise (vite:css / visualizer / tailwind are expected). */
      rolldownOptions: {
        checks: {
          pluginTimings: false,
        },
      },
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.message.includes("/*#__PURE__*/")) return;
          warn(warning);
        },
        output: {
          manualChunks(id) {
            if (
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/react-router-dom/") ||
              id.includes("node_modules/react-router/")
            ) {
              return "react";
            }
            if (id.includes("node_modules/@mui/material/") || id.includes("node_modules/@mui/x-data-grid/")) {
              return "mui";
            }
            if (id.includes("node_modules/leaflet/") || id.includes("node_modules/react-leaflet/")) {
              return "leaflet";
            }
            if (id.includes("node_modules/@microsoft/signalr/")) {
              return "signalr";
            }
            if (id.includes("node_modules/react-toastify/") || id.includes("node_modules/js-cookie/")) {
              return "misc";
            }
          },
        },
      },
    },
  };
});
