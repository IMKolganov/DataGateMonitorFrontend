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
        target: "https://dev-dash.datagateapp.com",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      "/api": {
        target: "https://dev-dash.datagateapp.com",
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
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          mui: ["@mui/material", "@mui/x-data-grid"],
          leaflet: ["leaflet", "react-leaflet"],
          signalr: ["@microsoft/signalr"],
          misc: ["react-toastify", "js-cookie"], // removed "zustand"
        },
      },
    },
  }
});