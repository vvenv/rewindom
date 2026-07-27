import "../test/platform.routes.test-mocks.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildApp,
  platformToken,
  resetPlatformRouteMocks,
} from "../test/platform.routes.test-shared.js";

describe("platform-settings routes", () => {
  beforeEach(() => {
    resetPlatformRouteMocks();
  });

  it("GET /settings 返回平台设置", async () => {
    const { getPlatformSettings } =
      await import("../services/platform-settings.service.js");

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/settings",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(getPlatformSettings).toHaveBeenCalled();
    expect(response.json().data.registration_enabled).toBe(true);
  });

  it("PUT /settings 更新平台设置", async () => {
    const { savePlatformSettings } =
      await import("../services/platform-settings.service.js");

    const app = await buildApp();
    const response = await app.inject({
      method: "PUT",
      url: "/api/platform/settings",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: { registration_enabled: false, require_tenant_approval: true },
    });

    expect(response.statusCode).toBe(200);
    expect(savePlatformSettings).toHaveBeenCalledWith({
      registration_enabled: false,
      require_tenant_approval: true,
    });
    expect(response.json().data.registration_enabled).toBe(false);
  });

  it("GET /plan-limits 返回套餐用量模板", async () => {
    const { getPlanLimitTemplates } =
      await import("../services/plan-limit-templates.service.js");
    vi.mocked(getPlanLimitTemplates).mockResolvedValueOnce({
      free: { max_documents: 10, max_users: 5 },
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/plan-limits",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.templates).toEqual({
      free: { max_documents: 10, max_users: 5 },
    });
  });

  it("PUT /plan-limits 更新套餐用量模板", async () => {
    const { savePlanLimitTemplates } =
      await import("../services/plan-limit-templates.service.js");
    vi.mocked(savePlanLimitTemplates).mockResolvedValueOnce({
      pro: { max_documents: 200 },
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "PUT",
      url: "/api/platform/plan-limits",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: { templates: { pro: { max_documents: 200 } } },
    });

    expect(response.statusCode).toBe(200);
    expect(savePlanLimitTemplates).toHaveBeenCalledWith({
      pro: { max_documents: 200 },
    });
  });
});
