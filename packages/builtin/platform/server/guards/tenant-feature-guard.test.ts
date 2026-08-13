import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type TenantFeatureKey } from "@rewindom/shared";

const { isTenantFeatureEnabledMock, getServerTenantCatalogMock } = vi.hoisted(
  () => ({
    isTenantFeatureEnabledMock: vi.fn(),
    getServerTenantCatalogMock: vi.fn(),
  }),
);

vi.mock("../services/tenant-feature.service.js", () => ({
  isTenantFeatureEnabled: isTenantFeatureEnabledMock,
}));

vi.mock("@rewindom/server-kernel/runtime/tenant-catalog.js", () => ({
  getServerTenantCatalog: getServerTenantCatalogMock,
}));

import { createTenantFeaturePreHandler } from "./tenant-feature-guard.js";

import type { FastifyRequest, FastifyReply } from "fastify";

const sampleCatalog = {
  modules: [],
  features: [
    {
      key: "advanced_analysis",
      label: "高级分析",
      description: "",
      disabled_hint: "",
      default_enabled: false,
      module_id: "notes",
    },
    {
      key: "custom_reports",
      label: "自定义报告",
      description: "",
      disabled_hint: "",
      default_enabled: false,
      module_id: "evidence-pack",
    },
  ],
};

function createMockRequest(tenantId = "tenant-1"): FastifyRequest {
  return {
    tenantContext: { tenant_id: tenantId },
  } as unknown as FastifyRequest;
}

function createMockReply() {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
}

describe("createTenantFeaturePreHandler", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    getServerTenantCatalogMock.mockReturnValue(sampleCatalog);
  });

  it("returns void when the feature is enabled", async () => {
    isTenantFeatureEnabledMock.mockResolvedValue(true);
    const handler = createTenantFeaturePreHandler("advanced_analysis");
    const reply = createMockReply();

    await handler(createMockRequest(), reply);

    expect(isTenantFeatureEnabledMock).toHaveBeenCalledWith(
      "tenant-1",
      "advanced_analysis",
    );
    expect(reply.code).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  it("sends 403 with feature label when the feature is disabled", async () => {
    isTenantFeatureEnabledMock.mockResolvedValue(false);
    const handler = createTenantFeaturePreHandler("advanced_analysis");
    const reply = createMockReply();

    await handler(createMockRequest(), reply);

    expect(isTenantFeatureEnabledMock).toHaveBeenCalledWith(
      "tenant-1",
      "advanced_analysis",
    );
    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({
      error: "高级分析功能未启用，请联系平台管理员",
      code: "FEATURE_DISABLED",
      params: { label: "高级分析" },
    });
  });

  it("uses catalog labels for known feature keys", async () => {
    isTenantFeatureEnabledMock.mockResolvedValue(false);

    for (const feature of sampleCatalog.features) {
      const handler = createTenantFeaturePreHandler(
        feature.key as TenantFeatureKey,
      );
      const reply = createMockReply();

      await handler(createMockRequest(), reply);

      expect(reply.send).toHaveBeenCalledWith({
        error: `${feature.label}功能未启用，请联系平台管理员`,
        code: "FEATURE_DISABLED",
        params: { label: feature.label },
      });

      vi.clearAllMocks();
      getServerTenantCatalogMock.mockReturnValue(sampleCatalog);
    }
  });

  it("passes the correct tenant_id from request context", async () => {
    isTenantFeatureEnabledMock.mockResolvedValue(true);
    const handler = createTenantFeaturePreHandler("custom_reports");

    await handler(createMockRequest("custom-tenant-42"), createMockReply());

    expect(isTenantFeatureEnabledMock).toHaveBeenCalledWith(
      "custom-tenant-42",
      "custom_reports",
    );
  });
});
