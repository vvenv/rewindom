import { describe, expect, it } from "vitest";

import {
  buildRegisterInput,
  canSubmitRegisterForm,
  INITIAL_REGISTER_FORM,
  validateRegisterForm,
} from "./register-form";

describe("register-form", () => {
  it("validates required fields", () => {
    expect(validateRegisterForm(INITIAL_REGISTER_FORM, null, false)).toBe(
      "请输入组织名称",
    );
  });

  it("requires captcha when enabled", () => {
    const values = {
      ...INITIAL_REGISTER_FORM,
      tenantName: "Acme",
      tenantSlug: "acme",
      username: "admin",
      password: "Password1",
      confirmPassword: "Password1",
      phone: "13800138000",
      email: "admin@acme.com",
    };

    expect(validateRegisterForm(values, null, true)).toBe("请完成滑块验证");
    expect(canSubmitRegisterForm(values, null, true)).toBe(false);
  });

  it("builds register payload", () => {
    const values = {
      ...INITIAL_REGISTER_FORM,
      tenantName: " Acme ",
      tenantSlug: " acme ",
      username: " admin ",
      password: "Password1",
      confirmPassword: "Password1",
      phone: " 13800138000 ",
      email: " admin@acme.com ",
    };

    expect(buildRegisterInput(values, "token-1")).toEqual({
      tenant_name: "Acme",
      tenant_slug: "acme",
      username: "admin",
      password: "Password1",
      phone: "13800138000",
      email: "admin@acme.com",
      captcha_token: "token-1",
    });
  });
});
