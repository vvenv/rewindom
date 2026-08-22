/**
 * 发信配置表单的纯逻辑。
 *
 * 全部围绕一件事：**区分「没改」「改成这个」「清掉本站覆盖」**。
 * 缺了这个区分，站长就没法把某一项还给平台默认——只能一直挂着自己填的值。
 */
import type {
  MailDriver,
  MailerConfigStatus,
  MailerConfigWriteBody,
} from "../../shared/index.js";

export interface MailerFormValues {
  /** 空串 = 跟随平台默认 */
  driver: MailDriver | "";
  from: string;
  smtp_host: string;
  /** 空串 = 跟随平台默认；表单里是字符串，提交前才转数字 */
  smtp_port: string;
  /** 三态：跟随平台 / 强制开 / 强制关 */
  smtp_secure: "" | "on" | "off";
  smtp_user: string;
  /** 空串 = 不修改；只有空白串才表示清掉已存的密码（见 buildMailerPayload） */
  smtp_password: string;
}

export const INITIAL_MAILER_FORM: MailerFormValues = {
  driver: "",
  from: "",
  smtp_host: "",
  smtp_port: "",
  smtp_secure: "",
  smtp_user: "",
  smtp_password: "",
};

/** 只用**本站覆盖**预填，不用生效值——否则一保存就把平台默认固化成本站覆盖。 */
export function toMailerFormValues(
  status: MailerConfigStatus,
): MailerFormValues {
  return {
    driver: status.driver ?? "",
    from: status.from ?? "",
    smtp_host: status.smtp_host ?? "",
    smtp_port: status.smtp_port === null ? "" : String(status.smtp_port),
    smtp_secure:
      status.smtp_secure === null ? "" : status.smtp_secure ? "on" : "off",
    smtp_user: status.smtp_user ?? "",
    smtp_password: "",
  };
}

/** 返回 i18n key（`mailer:` 命名空间内），没问题返回 null。 */
export function validateMailerForm(values: MailerFormValues): string | null {
  if (values.from.trim() && !values.from.includes("@")) {
    return "config.from";
  }
  if (values.smtp_port.trim()) {
    const port = Number(values.smtp_port.trim());
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return "config.smtpPort";
    }
  }
  return null;
}

/**
 * 表单值 → 写入体。
 *
 * 三态映射：
 * - 文本框留空 → `null`（清掉本站覆盖，回落平台）
 * - 文本框有值 → 该值
 * - 密码框留空 → **字段整个不传**（保持不变）；填了空白 → `null`（清掉）
 *
 * 密码之所以反过来，是因为输入框里从不回显密码：如果留空也当「清掉」，
 * 那么每次只想改端口都会顺手把密码抹了。
 */
export function buildMailerPayload(
  values: MailerFormValues,
): MailerConfigWriteBody {
  const text = (raw: string): string | null => raw.trim() || null;

  const payload: MailerConfigWriteBody = {
    driver: values.driver || null,
    from: text(values.from),
    smtp_host: text(values.smtp_host),
    smtp_port: values.smtp_port.trim() ? Number(values.smtp_port.trim()) : null,
    smtp_secure: values.smtp_secure === "" ? null : values.smtp_secure === "on",
    smtp_user: text(values.smtp_user),
  };

  if (values.smtp_password !== "") {
    payload.smtp_password = values.smtp_password.trim() || null;
  }

  return payload;
}
