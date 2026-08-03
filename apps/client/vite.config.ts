import path from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

import { manualChunks } from "./vite-manual-chunks";

const PLATFORM_DEV_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

const SPA_PREFIX_RE =
  /^\/(app|login|register|platform|billing|settings|notes|todos|users|roles|audit|notifications|api|assets|@|src|node_modules)(\/|$)/u;

/** 租户 Host 下将文档导航代理到 Fastify Marketing SSR（平台 Host 仍走 Vite/预渲染）。 */
function tenantMarketingSsrProxy(): Plugin {
  return {
    name: "tenant-marketing-ssr-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const hostHeader = req.headers.host?.split(":")[0]?.toLowerCase() ?? "";
        if (!hostHeader || PLATFORM_DEV_HOSTS.has(hostHeader)) {
          next();
          return;
        }
        const url = req.url?.split("?")[0] ?? "/";
        if (SPA_PREFIX_RE.test(url)) {
          next();
          return;
        }
        if (req.method !== "GET" && req.method !== "HEAD") {
          next();
          return;
        }
        const accept = req.headers.accept ?? "";
        const wantsHtml =
          url === "/sitemap.xml" ||
          url === "/robots.txt" ||
          accept.includes("text/html") ||
          accept.includes("*/*");
        if (!wantsHtml) {
          next();
          return;
        }

        void import("node:http").then(({ request: httpRequest }) => {
          const proxyReq = httpRequest(
            {
              hostname: "127.0.0.1",
              port: 3700,
              path: req.url,
              method: req.method,
              headers: {
                ...req.headers,
                host: req.headers.host,
              },
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
              proxyRes.pipe(res);
            },
          );
          proxyReq.on("error", () => {
            next();
          });
          proxyReq.end();
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss(), tenantMarketingSsrProxy()],
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
    allowedHosts: ["localhost", "127.0.0.1", "::1", "local.water.moms.plus"],
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
