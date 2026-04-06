// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "fs";
import { visualizer } from "rollup-plugin-visualizer";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));

/** Same target for `/api` proxy and (in dev) direct SignalR URL — avoids broken WS upgrade via Vite. */
const defaultProxyTarget = process.env.VITE_PROXY_TARGET ?? "https://dev-api.datagateapp.com/";

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  const signalrDevOrigin = new URL(defaultProxyTarget).origin;

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
      port: Number(process.env.VITE_PORT) || 5582,
      proxy: {
        "/api/hubs": {
          target: defaultProxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        "/api": {
          target: defaultProxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },

    preview: {
      port: Number(process.env.VITE_PORT) || 5582,
    },

    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      /** Injected only in dev build; status-stream connects here to bypass Vite WS proxy. */
      __VITE_SIGNALR_DEV_ORIGIN__: JSON.stringify(isDev ? signalrDevOrigin : ""),
    },

    build: {
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1200,
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
