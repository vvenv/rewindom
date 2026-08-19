import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const llm = vi.hoisted(() => ({
  getTenantLlmStatus: vi.fn(),
  updateTenantLlmConfig: vi.fn(),
}));

vi.mock("@rewindom/server-kernel/lib/tenant-llm.js", () => ({
  getTenantLlmStatus: (...args: unknown[]) => llm.getTenantLlmStatus(...args),
  updateTenantLlmConfig: (...args: unknown[]) =>
    llm.updateTenantLlmConfig(...args),
}));

import {
  createRouteTestApp,
  createTestUserFast,
  type TestApp,
  type TestUser,
} from "@rewindom/server-test";
import { installTestPermissionCatalog } from "@rewindom/server-test/permission-catalog";
import { DEFAULT_TENANT_ID } from "@rewindom/shared";

import { tenantOpenaiRoutes } from "./tenant-openai.routes.js";

installTestPermissionCatalog([
  { key: "settings.read", label: "查看设置", group: "系统设置" },
  { key: "settings.write", label: "管理设置", group: "系统设置" },
]);

const STATUS = {
  configured: true,
  source: "tenant" as const,
  api_key_hint: "…abcd",
  model: "site-model",
  resolved_model: "site-model",
  model_source: "tenant" as const,
  temperature: 0.4,
  resolved_temperature: 0.4,
  temperature_source: "tenant" as const,
};

describe("tenant openai settings routes", () => {
  let app: TestApp;
  let admin: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(tenantOpenaiRoutes, { prefix: "/api/settings" });
    });
    admin = await createTestUserFast(app, "openai_admin", "password123", {
      is_system_admin: true,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    llm.getTenantLlmStatus.mockResolvedValue(STATUS);
    llm.updateTenantLlmConfig.mockResolvedValue(STATUS);
  });

  function authHeaders(user: TestUser): { authorization: string } {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  it("rejects anonymous access", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/settings/openai",
    });

    expect(response.statusCode).toBe(401);
    expect(llm.getTenantLlmStatus).not.toHaveBeenCalled();
  });

  it("GET /openai 返回状态且不含明文密钥", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/settings/openai",
      headers: authHeaders(admin),
    });

    expect(response.statusCode, JSON.stringify(response.json())).toBe(200);
    expect(llm.getTenantLlmStatus).toHaveBeenCalledWith(DEFAULT_TENANT_ID);
    expect(response.json().data.source).toBe("tenant");
    expect(JSON.stringify(response.json())).not.toContain("sk-");
  });

  it("PUT /openai 空串 api_key 表示清除本站密钥", async () => {
    llm.updateTenantLlmConfig.mockResolvedValue({
      ...STATUS,
      source: "platform",
      api_key_hint: null,
    });
    const response = await app.inject({
      method: "PUT",
      url: "/api/settings/openai",
      headers: authHeaders(admin),
      payload: { api_key: "" },
    });

    expect(response.statusCode, JSON.stringify(response.json())).toBe(200);
    expect(llm.updateTenantLlmConfig).toHaveBeenCalledWith(DEFAULT_TENANT_ID, {
      api_key: "",
    });
    expect(response.json().data.source).toBe("platform");
    expect(response.json().data.api_key_hint).toBeNull();
  });

  it("PUT /openai 写入覆盖并回状态", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/settings/openai",
      headers: authHeaders(admin),
      payload: { api_key: "sk-new", model: "gpt-4o", temperature: 0.2 },
    });

    expect(response.statusCode, JSON.stringify(response.json())).toBe(200);
    expect(llm.updateTenantLlmConfig).toHaveBeenCalledWith(DEFAULT_TENANT_ID, {
      api_key: "sk-new",
      model: "gpt-4o",
      temperature: 0.2,
    });
    expect(response.json().data.api_key_hint).toBe("…abcd");
  });
});
