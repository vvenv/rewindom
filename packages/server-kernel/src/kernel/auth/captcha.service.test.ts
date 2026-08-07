import { describe, it, expect, beforeEach } from "vitest";

import { CaptchaService } from "./captcha.service.js";

describe("captcha.service", () => {
  beforeEach(() => {
    // 静态 Map 跨用例留存,每次清空保证隔离
    CaptchaService.clearChallenges();
  });

  describe("generateChallenge", () => {
    it("返回带 id/token/expiresAt/target 的挑战", () => {
      const c = CaptchaService.generateChallenge();
      expect(c.id).toEqual(expect.any(String));
      expect(c.token).toEqual(expect.any(String));
      expect(c.token).toHaveLength(64); // 32 bytes hex
      expect(c.expiresAt).toEqual(expect.any(String));
      expect(c.targetX).toBeGreaterThanOrEqual(16);
      expect(c.targetX).toBeLessThanOrEqual(284);
      expect(c.targetY).toBeGreaterThanOrEqual(16);
      expect(c.targetY).toBeLessThanOrEqual(84);
    });

    it("每次生成的 id 与 token 唯一", () => {
      const a = CaptchaService.generateChallenge();
      const b = CaptchaService.generateChallenge();
      expect(a.id).not.toBe(b.id);
      expect(a.token).not.toBe(b.token);
    });

    it("expiresAt 在未来 5 分钟内", () => {
      const c = CaptchaService.generateChallenge();
      const expires = new Date(c.expiresAt).getTime();
      const now = Date.now();
      // 5 分钟 TTL,允许 1 秒误差
      expect(expires).toBeGreaterThan(now);
      expect(expires - now).toBeLessThanOrEqual(5 * 60 * 1000 + 1000);
    });

    it("生成的挑战可通过 getChallenge 取回", () => {
      const c = CaptchaService.generateChallenge();
      expect(CaptchaService.getChallenge(c.id)).toEqual(c);
    });
  });

  describe("verify 成功", () => {
    it("精确命中目标返回 true 并删除挑战(一次性)", () => {
      const c = CaptchaService.generateChallenge();
      const ok = CaptchaService.verify({
        id: c.id,
        token: c.token,
        x: c.targetX,
        y: c.targetY,
      });
      expect(ok).toBe(true);
      // 一次性消费,验证后即删
      expect(CaptchaService.getChallenge(c.id)).toBeUndefined();
    });

    it("在容差范围内(<=10px)也算成功", () => {
      const c = CaptchaService.generateChallenge();
      expect(
        CaptchaService.verify({
          id: c.id,
          token: c.token,
          x: c.targetX + 10,
          y: c.targetY - 10,
        }),
      ).toBe(true);
    });
  });

  describe("verify 失败", () => {
    it("不存在的 id 返回 false", () => {
      expect(
        CaptchaService.verify({
          id: "nonexistent",
          token: "any",
          x: 0,
          y: 0,
        }),
      ).toBe(false);
    });

    it("token 不匹配返回 false 并删除挑战", () => {
      const c = CaptchaService.generateChallenge();
      const ok = CaptchaService.verify({
        id: c.id,
        token: "wrong-token",
        x: c.targetX,
        y: c.targetY,
      });
      expect(ok).toBe(false);
      // token 错也视为尝试,删除挑战防止爆破
      expect(CaptchaService.getChallenge(c.id)).toBeUndefined();
    });

    it("位置偏差超过容差返回 false", () => {
      const c = CaptchaService.generateChallenge();
      const ok = CaptchaService.verify({
        id: c.id,
        token: c.token,
        x: c.targetX + 11,
        y: c.targetY,
      });
      expect(ok).toBe(false);
    });

    it("成功后再次 verify 同一挑战返回 false(已删除)", () => {
      const c = CaptchaService.generateChallenge();
      CaptchaService.verify({
        id: c.id,
        token: c.token,
        x: c.targetX,
        y: c.targetY,
      });
      // 第二次:挑战已被消费
      expect(
        CaptchaService.verify({
          id: c.id,
          token: c.token,
          x: c.targetX,
          y: c.targetY,
        }),
      ).toBe(false);
    });
  });
});
