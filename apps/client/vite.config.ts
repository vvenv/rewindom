import path from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { manualChunks } from "./vite-manual-chunks";

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // 使用默认 outDir: "dist"
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3700",
        timeout: 600_000,
        proxyTimeout: 600_000,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            if (req.headers.accept?.includes("text/event-stream")) {
              proxyReq.setHeader("Accept-Encoding", "identity");
            }
          });
          proxy.on("proxyRes", (proxyRes, req, res) => {
            if (
              req.headers.accept?.includes("text/event-stream") ||
              proxyRes.headers["content-type"]?.includes("text/event-stream")
            ) {
              res.setHeader("X-Accel-Buffering", "no");
              res.setHeader("Cache-Control", "no-cache, no-transform");
            }
          });
        },
      },
    },
  },
}));
