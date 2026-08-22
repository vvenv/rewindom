import { describe, expect, it } from "vitest";

import {
  INITIAL_MAILER_FORM,
  buildMailerPayload,
  toMailerFormValues,
  validateMailerForm,
} from "./mailer-form.js";

import type { MailerConfigStatus } from "../../shared/index.js";

function status(
  overrides: Partial<MailerConfigStatus> = {},
): MailerConfigStatus {
  return {
    configured: true,
    source: "platform",
    driver: null,
    from: null,
    smtp_host: null,
    smtp_port: null,
    smtp_secure: null,
    smtp_user: null,
    smtp_password_hint: null,
    resolved_driver: "smtp",
    resolved_from: "platform@example.com",
    resolved_smtp_host: "smtp.example.com",
    resolved_smtp_port: 587,
    resolved_smtp_secure: false,
    resolved_smtp_user: "platform",
    ...overrides,
  };
}

describe("toMailerFormValues", () => {
  it("只用本站覆盖预填，不碰生效值", () => {
    // 全部继承平台时表单必须是空的：预填生效值再保存，
    // 会把平台默认原样固化成本站覆盖，之后平台改配置这个站就跟不上了
    expect(toMailerFormValues(status())).toEqual(INITIAL_MAILER_FORM);
  });

  it("有本站覆盖时按覆盖值预填", () => {
    const values = toMailerFormValues(
      status({ from: "site@example.com", smtp_port: 465, smtp_secure: true }),
    );
    expect(values.from).toBe("site@example.com");
    expect(values.smtp_port).toBe("465");
    expect(values.smtp_secure).toBe("on");
  });

  it("smtp_secure 显式为 false 时不会退化成「跟随平台」", () => {
    expect(toMailerFormValues(status({ smtp_secure: false })).smtp_secure).toBe(
      "off",
    );
  });

  it("从不回显密码", () => {
    expect(
      toMailerFormValues(status({ smtp_password_hint: "…9876" })).smtp_password,
    ).toBe("");
  });
});

describe("validateMailerForm", () => {
  it("空表单合法：全部留空就是完全跟随平台", () => {
    expect(validateMailerForm(INITIAL_MAILER_FORM)).toBeNull();
  });

  it("发件人必须像个地址", () => {
    expect(
      validateMailerForm({ ...INITIAL_MAILER_FORM, from: "not-an-address" }),
    ).toBe("config.from");
  });

  it.each(["0", "70000", "abc", "1.5"])("端口 %s 不合法", (port) => {
    expect(
      validateMailerForm({ ...INITIAL_MAILER_FORM, smtp_port: port }),
    ).toBe("config.smtpPort");
  });

  it("端口留空合法", () => {
    expect(
      validateMailerForm({ ...INITIAL_MAILER_FORM, smtp_port: "  " }),
    ).toBeNull();
  });
});

describe("buildMailerPayload", () => {
  it("留空的文本字段送 null，表示清掉本站覆盖", () => {
    expect(buildMailerPayload(INITIAL_MAILER_FORM)).toEqual({
      driver: null,
      from: null,
      smtp_host: null,
      smtp_port: null,
      smtp_secure: null,
      smtp_user: null,
    });
  });

  it("密码留空时字段整个不传——只想改端口不该把密码抹掉", () => {
    const payload = buildMailerPayload({
      ...INITIAL_MAILER_FORM,
      smtp_port: "465",
    });
    expect("smtp_password" in payload).toBe(false);
    expect(payload.smtp_port).toBe(465);
  });

  it("密码填空白表示清掉已存的密码", () => {
    expect(
      buildMailerPayload({ ...INITIAL_MAILER_FORM, smtp_password: "   " })
        .smtp_password,
    ).toBeNull();
  });

  it("密码填了值就原样送出（不 trim 掉内部字符）", () => {
    expect(
      buildMailerPayload({ ...INITIAL_MAILER_FORM, smtp_password: " s3cret " })
        .smtp_password,
    ).toBe("s3cret");
  });

  it("三态开关映射正确", () => {
    expect(
      buildMailerPayload({ ...INITIAL_MAILER_FORM, smtp_secure: "off" })
        .smtp_secure,
    ).toBe(false);
    expect(
      buildMailerPayload({ ...INITIAL_MAILER_FORM, smtp_secure: "on" })
        .smtp_secure,
    ).toBe(true);
  });
});
