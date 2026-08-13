import { createQueryWrapper, createTestQueryClient } from "@rewindom/client-test";
import { server } from "@rewindom/client-test/server";
import { render, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";


import { NotificationBridge } from "./NotificationBridge.js";

// showDesktopNotification 依赖浏览器 Notification API（测试环境不支持），
// 这里只 spy 该函数以验证组件是否尝试推送，其余水印工具保持 stub。
const mockShowDesktopNotification = vi.fn();

vi.mock("../lib/desktop-notification.js", () => ({
  clearNotificationPushWatermark: vi.fn(),
  readNotificationPushWatermark: vi.fn(() => ""),
  showDesktopNotification: (...args: unknown[]) =>
    mockShowDesktopNotification(...args),
  writeNotificationPushWatermark: vi.fn(),
}));

// 真实渲染：不再 mock react-router / useNotifications / useMarkNotificationRead。
// useNotifications 内部调用 GET /api/notifications，由 MSW 在网络层拦截；
// useMarkNotificationRead 为 mutation，仅需 QueryClientProvider 即可真实运行。
function renderBridge() {
  return render(
    <MemoryRouter>
      <NotificationBridge />
    </MemoryRouter>,
    { wrapper: createQueryWrapper(createTestQueryClient()) },
  );
}

describe("NotificationBridge", () => {
  beforeEach(() => {
    mockShowDesktopNotification.mockClear();
  });

  it("应该渲染为空", async () => {
    server.use(
      http.get("/api/notifications", () =>
        HttpResponse.json({
          data: { items: [], total: 0, page: 1, page_size: 50 },
        }),
      ),
    );

    const { container } = renderBridge();

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("有新消息时应尝试推送桌面通知", async () => {
    server.use(
      http.get("/api/notifications", () =>
        HttpResponse.json({
          data: {
            items: [
              {
                id: "n1",
                type: "document_processed",
                created_at: "2026-06-14T10:00:00.000Z",
                title: "新消息",
                body: "内容",
                severity: "info",
                read_at: null,
                link_path: null,
                metadata: null,
              },
            ],
            total: 1,
            page: 1,
            page_size: 50,
          },
        }),
      ),
    );

    renderBridge();

    await waitFor(() => {
      expect(mockShowDesktopNotification).toHaveBeenCalled();
    });
  });
});
