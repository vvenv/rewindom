import { createQueryWrapper, createTestQueryClient } from "@be-water/client-test";
import { server } from "@be-water/client-test/server";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";


import { NotificationPanelContent } from "./NotificationPanel.js";

// 本地偏好 hook：依赖浏览器 Notification API，按迁移规则保留 mock。
vi.mock(
  "../hooks/useDesktopNotificationPreference.js",
  () => ({
    useDesktopNotificationPreference: () => ({
      supported: false,
      permission: "default",
      enabled: false,
      backgroundOnly: false,
      setEnabled: vi.fn(),
      setBackgroundOnly: vi.fn(),
      requestPermission: vi.fn(),
    }),
  }),
);

// 真实渲染：不再 mock useUnreadNotificationCount / useNotifications /
// useMarkNotificationRead / useMarkAllNotificationsRead。
// 这些 hook 内部调用：
//   GET /api/notifications/unread-count
//   GET /api/notifications
// 由 MSW 在网络层拦截；mutation hook 仅需 QueryClientProvider 即可真实运行。

const notificationItem = {
  id: "n1",
  type: "document_processed",
  created_at: "2026-06-14T10:00:00.000Z",
  title: "系统通知",
  body: "测试内容",
  severity: "info" as const,
  read_at: null,
  link_path: null,
  metadata: null,
};

describe("NotificationPanelContent", () => {
  const wrapper = createQueryWrapper(createTestQueryClient());

  it("应该渲染通知列表", async () => {
    server.use(
      http.get("/api/notifications/unread-count", () =>
        HttpResponse.json({ data: { total: 2 } }),
      ),
      http.get("/api/notifications", () =>
        HttpResponse.json({
          data: {
            items: [notificationItem],
            total: 1,
            page: 1,
            page_size: 30,
          },
        }),
      ),
    );

    render(<NotificationPanelContent active />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("系统通知")).toBeInTheDocument();
    });
    expect(screen.getByText("测试内容")).toBeInTheDocument();
  });

  it("有未读时应显示全部标为已读", async () => {
    server.use(
      http.get("/api/notifications/unread-count", () =>
        HttpResponse.json({ data: { total: 2 } }),
      ),
      http.get("/api/notifications", () =>
        HttpResponse.json({
          data: { items: [], total: 0, page: 1, page_size: 30 },
        }),
      ),
    );

    render(<NotificationPanelContent active />, { wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "全部标为已读" }),
      ).toBeInTheDocument();
    });
  });
});
