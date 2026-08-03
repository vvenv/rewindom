import {
  createTestQueryClient,
  createQueryWrapper,
} from "@be-water/client-test/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { api } from "../api.js";

import { useTenantEntitlements } from "./useTenantEntitlements.js";

vi.mock("../api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api.js")>();
  return {
    ...actual,
    api: {
      get: vi.fn(),
    },
  };
});

/** 单测只验证 query 本身；会话门控见 use-tenant-api-enabled。 */
vi.mock("./use-tenant-api-enabled.js", () => ({
  useTenantApiEnabled: (enabled = true) => enabled,
}));

describe("useTenantEntitlements", () => {
  const mockApiGet = vi.mocked(api.get);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enabled 为 false 时不执行查询", () => {
    const queryClient = createTestQueryClient();
    const wrapper = createQueryWrapper(queryClient);
    renderHook(() => useTenantEntitlements(false), { wrapper });

    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("enabled 为 true 时应该执行查询", async () => {
    const mockResponse = {
      features: {
        chat: true,
        advanced_analysis: true,
        vector_search: true,
        bulk_import: false,
        api_access: false,
        custom_reports: false,
      },
    };
    mockApiGet.mockResolvedValue(mockResponse);

    const queryClient = createTestQueryClient();
    const wrapper = createQueryWrapper(queryClient);
    const { result } = renderHook(() => useTenantEntitlements(true), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockApiGet).toHaveBeenCalledWith("/settings/tenant-features");
    expect(result.current.data).toEqual(mockResponse);
  });

  it("应该处理 API 错误", async () => {
    mockApiGet.mockRejectedValue(new Error("API Error"));

    const queryClient = createTestQueryClient();
    const wrapper = createQueryWrapper(queryClient);
    const { result } = renderHook(() => useTenantEntitlements(true), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it("默认 enabled 为 true", async () => {
    mockApiGet.mockResolvedValue({
      features: {
        chat: true,
        advanced_analysis: false,
        vector_search: true,
        bulk_import: false,
        api_access: false,
        custom_reports: false,
      },
    });

    const queryClient = createTestQueryClient();
    const wrapper = createQueryWrapper(queryClient);
    renderHook(() => useTenantEntitlements(), { wrapper });

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalled();
    });
  });
});
