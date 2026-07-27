import { createQueryWrapper, createTestQueryClient } from "@be-water/client-test";
import { server } from "@be-water/client-test/server";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, it, expect } from "vitest";


import { TenantStats } from "./TenantStats.js";

// 真实渲染：不再 mock usePlatformTenantStats。
// 由 MSW 拦截 GET /api/platform/tenants/:id/stats。

const STATS_URL = "/api/platform/tenants/:id/stats";

function renderStats(tenantId: string) {
  const wrapper = createQueryWrapper(createTestQueryClient());
  return render(<TenantStats tenantId={tenantId} />, { wrapper });
}

describe("TenantStats", () => {
  it("加载中显示占位符", async () => {
    // 永不响应，使 query 停留在 loading 状态
    server.use(http.get(STATS_URL, () => new Promise<Response>(() => {})));

    renderStats("t1");

    await waitFor(() => {
      expect(screen.getByText("…")).toBeInTheDocument();
    });
  });

  it("无数据时显示破折号", async () => {
    server.use(
      http.get(STATS_URL, () =>
        HttpResponse.json({ error: "失败" }, { status: 500 }),
      ),
    );

    renderStats("t1");

    await waitFor(() => {
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  it("应显示统计数据", async () => {
    server.use(
      http.get(STATS_URL, () =>
        HttpResponse.json({
          data: {
            document_count: 30,
            product_count: 50,
            analysis_count: 12,
            user_count: 8,
          },
        }),
      ),
    );

    renderStats("t1");

    await waitFor(() => {
      expect(screen.getByText("文档 30")).toBeInTheDocument();
    });
    expect(screen.getByText("产品 50")).toBeInTheDocument();
    expect(screen.getByText("分析 12")).toBeInTheDocument();
    expect(screen.getByText("用户 8")).toBeInTheDocument();
  });
});
