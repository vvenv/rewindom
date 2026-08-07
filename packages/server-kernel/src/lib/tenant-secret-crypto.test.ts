import { describe, it, expect, vi } from "vitest";

// config 在 VITEST=true 时提供 fallback 密钥(Buffer.alloc(32, 0)),
// 直接用真实 config 即可验证加解密对称性,不需要 mock。
vi.mock("dotenv", () => ({ config: vi.fn() }));

import { ValidationError } from "./app-errors.js";
import {
  encryptTenantSecret,
  decryptTenantSecret,
} from "./tenant-secret-crypto.js";

describe("tenant-secret-crypto", () => {
  // 每条用例都验证「能加就能解」,这是对称加密最该守住的不变量。
  describe("加密-解密往返", () => {
    it("普通字符串可往返", () => {
      const plaintext = "sk-live-1234567890";
      const ciphertext = encryptTenantSecret(plaintext);
      expect(ciphertext).not.toBe(plaintext);
      expect(decryptTenantSecret(ciphertext)).toBe(plaintext);
    });

    it("空明文加密后再解密抛 ValidationError(源码要求至少 1 字节明文)", () => {
      // GCM 空明文加密后 iv(12)+authTag(16)+密文(0)=28 字节,
      // 解密端长度检查要求 >=29,因此空明文往返被拦截
      const ciphertext = encryptTenantSecret("");
      expect(() => decryptTenantSecret(ciphertext)).toThrow(ValidationError);
    });

    it("Unicode / 中文可往返", () => {
      const plaintext = "租户密钥-🔑-secret";
      const ciphertext = encryptTenantSecret(plaintext);
      expect(decryptTenantSecret(ciphertext)).toBe(plaintext);
    });

    it("长字符串可往返", () => {
      const plaintext = "x".repeat(10_000);
      expect(decryptTenantSecret(encryptTenantSecret(plaintext))).toBe(
        plaintext,
      );
    });
  });

  describe("密文格式", () => {
    it("每次加密产生不同密文(IV 随机)", () => {
      const plaintext = "same-secret";
      const a = encryptTenantSecret(plaintext);
      const b = encryptTenantSecret(plaintext);
      expect(a).not.toBe(b);
      // 但两者都能解回原文
      expect(decryptTenantSecret(a)).toBe(plaintext);
      expect(decryptTenantSecret(b)).toBe(plaintext);
    });

    it("密文是 base64 字符串", () => {
      const ciphertext = encryptTenantSecret("x");
      expect(typeof ciphertext).toBe("string");
      // base64 字符集
      expect(ciphertext).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    });
  });

  describe("解密失败", () => {
    it("篡改密文导致解密失败(GCM 完整性校验)", () => {
      const ciphertext = encryptTenantSecret("secret");
      // 直接翻转 authTag 的某字节(索引 12 在 iv 之后、authTag 起始处),
      // 比 base64 字符翻转更可靠地破坏完整性
      const buf = Buffer.from(ciphertext, "base64");
      const tampered = Buffer.from(buf);
      tampered[12] ^= 0xff;
      const tamperedBase64 = tampered.toString("base64");
      // GCM 校验失败抛 crypto 原生错误(非 ValidationError),证明篡改被检测
      expect(() => decryptTenantSecret(tamperedBase64)).toThrow();
    });

    it("过短的输入(不足 iv+authTag+1)抛 ValidationError", () => {
      // 12(iv) + 16(authTag) + 1(密文) = 29 字节是下限
      // 28 字节的 base64 解出来不够长
      const short = Buffer.alloc(28, 0).toString("base64");
      expect(() => decryptTenantSecret(short)).toThrow(ValidationError);
    });

    it("非 base64 输入抛错(不返回原值)", () => {
      // 包含 base64 非法字符,Buffer.from 会得到空或残缺数据
      expect(() => decryptTenantSecret("!!!not-base64!!!")).toThrow(
        ValidationError,
      );
    });
  });
});
