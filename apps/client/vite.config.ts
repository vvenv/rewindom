import path from "path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

import { manualChunks } from "./vite-manual-chunks";
import {
  shouldBypassMarketingSsrProxy,
  shouldProxyDocumentToMarketingSsr,
} from "./vite-marketing-ssr-proxy";

/** 平台控制台 Host：不代理 Marketing SSR（与 server `getPlatformConsoleHostnames` 对齐）。 */
const PLATFORM_CONSOLE_DEV_HOSTS = new Set([
  "127.0.0.1",
  "::1",
  "[::1]",
]);

/**
 * 产品站 / 租户 Host 下将文档导航代理到 Fastify Marketing SSR。
 * 本地：`localhost` → 默认租户 SSR；`127.0.0.1` → 平台控制台 Vite SPA。
 */
function tenantMarketingSsrProxy(): Plugin {
  return {
    name: "tenant-marketing-ssr-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const hostHeader = req.headers.host?.split(":")[0]?.toLowerCase() ?? "";
        if (!hostHeader || PLATFORM_CONSOLE_DEV_HOSTS.has(hostHeader)) {
          next();
          return;
        }
        const url = req.url?.split("?")[0] ?? "/";
        if (shouldBypassMarketingSsrProxy(url)) {
          next();
          return;
        }
        const accept = req.headers.accept ?? "";
        if (
          !shouldProxyDocumentToMarketingSsr(
            url,
            req.method ?? "GET",
            accept,
          )
        ) {
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
    /*
     * `.localhost` 是前缀写法（vite：以点开头 = 该域及其全部子域），用来支持
     * 本地多租户：配 `TENANT_BASE_DOMAIN=localhost` 后 `{slug}.localhost:7300`
     * 就会走通配子域解析到对应租户。浏览器原生把 `*.localhost` 解析到回环地址，
     * 不用改 hosts 文件；少了它 vite 会以 "Blocked request" 直接挡掉。
     */
    allowedHosts: [".localhost", "127.0.0.1", "::1", "local.moms.plus"],
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
