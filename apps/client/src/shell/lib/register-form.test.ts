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
      "auth.validation.tenantNameRequired",
    );
  });

  it("skips org fields in single-tenant mode", () => {
    const values = {
      ...INITIAL_REGISTER_FORM,
      username: "alice",
      password: "Password1",
      confirmPassword: "Password1",
      phone: "13800138000",
      email: "alice@example.com",
    };

    expect(
      validateRegisterForm(values, null, false, { singleTenant: true }),
    ).toBeNull();
    expect(
      canSubmitRegisterForm(values, null, false, { singleTenant: true }),
    ).toBe(true);
    expect(buildRegisterInput(values, "token-1", { singleTenant: true })).toEqual(
      {
        username: "alice",
        password: "Password1",
        phone: "13800138000",
        email: "alice@example.com",
        captcha_token: "token-1",
      },
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

    expect(validateRegisterForm(values, null, true)).toBe(
      "auth.validation.captchaRequired",
    );
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
