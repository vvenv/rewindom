import { describe, expect, it } from "vitest";

import { Secret, TOTP } from "otpauth";

import { TwoFactorService } from "./two-factor.service.js";

describe("TwoFactorService.verifyTotp", () => {
  it("接受当前时间窗内的合法码", () => {
    const secret = new Secret({ size: 20 });
    const totp = new TOTP({
      secret,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });
    expect(TwoFactorService.verifyTotp(secret.base32, totp.generate())).toBe(
      true,
    );
  });

  it("拒绝明显错误的码", () => {
    const secret = new Secret({ size: 20 });
    expect(TwoFactorService.verifyTotp(secret.base32, "000000")).toBe(false);
  });
});
