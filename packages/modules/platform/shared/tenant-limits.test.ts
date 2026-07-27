import { describe, expect, it } from "vitest";

import {
  TENANT_LIMIT_REGISTRY,
  TENANT_LIMIT_KEYS,
  formatLimitExceededMessage,
} from "./tenant-limits.js";

describe("TENANT_LIMIT_REGISTRY", () => {
  it("上游只注册底座自身的配额", () => {
    expect(Object.keys(TENANT_LIMIT_REGISTRY)).toEqual(["max_users"]);
  });

  it("每个限制条目应包含完整的定义字段", () => {
    for (const entry of Object.values(TENANT_LIMIT_REGISTRY)) {
      expect(entry).toHaveProperty("key");
      expect(entry).toHaveProperty("label");
      expect(entry).toHaveProperty("description");
      expect(entry).toHaveProperty("default_value");
      expect(entry).toHaveProperty("min");
      expect(typeof entry.key).toBe("string");
      expect(typeof entry.label).toBe("string");
      expect(typeof entry.description).toBe("string");
      expect(typeof entry.min).toBe("number");
    }
  });

  it("key 字段应与注册键名一致", () => {
    for (const [key, entry] of Object.entries(TENANT_LIMIT_REGISTRY)) {
      expect(entry.key).toBe(key);
    }
  });
});

describe("TENANT_LIMIT_KEYS", () => {
  it("应该包含所有注册的 limit key", () => {
    expect(TENANT_LIMIT_KEYS).toEqual(Object.keys(TENANT_LIMIT_REGISTRY));
  });
});

describe("formatLimitExceededMessage", () => {
  it("应该正确格式化超出限制的消息", () => {
    expect(formatLimitExceededMessage("max_users", 50)).toBe(
      "已达用户数上限（50），请联系平台管理员升级套餐",
    );
  });

  it("对所有注册的 key 都能生成消息", () => {
    for (const key of TENANT_LIMIT_KEYS) {
      const msg = formatLimitExceededMessage(key, 100);
      expect(msg).toContain(TENANT_LIMIT_REGISTRY[key].label);
      expect(msg).toContain("100");
      expect(msg).toContain("请联系平台管理员");
    }
  });
});
