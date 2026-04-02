// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { visualizer } from "rollup-plugin-visualizer";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: "dist/stats.html",
      template: "treemap", // visualize bundle size
      gzipSize: true,
      brotliSize: true,
      open: false, // auto-open after build
    }),
  ],

  server: {
    port: Number(process.env.VITE_PORT) || 5582,
    proxy: {
      "/api/hubs": {
        target: "http://localhost:5581",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      "/api": {
        target: "http://localhost:5581",
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
        // Rolldown (Vite 8) accepts only a function for manualChunks, not a package→chunk map.
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
  }
});