/**
 * 发信配置：TenantSetting 加密存储 + 运行时解析。
 *
 * 优先级：**本站覆盖 > 平台 env**，与 `lib/tenant-llm.ts` 同一套，实现刻意抄它的形状
 * （读→合并→写回，密钥单独走 secret 列）。任何接口都不把密码回给浏览器；
 * 设置页读 `getMailerConfigStatus`。
 *
 * 合并是**逐字段**的，不是整体二选一：租户只想改发件人、继续用平台 SMTP 主机
 * 是常见诉求，整体切换会逼他们把平台凭据抄一遍到自己的设置里。
 */

import { Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import { ValidationError } from "@rewindom/server-kernel/lib/app-errors.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import {
  decryptTenantSecret,
  encryptTenantSecret,
} from "@rewindom/server-kernel/lib/tenant-secret-crypto.js";
import { maskApiKeyHint } from "@rewindom/shared";

import {
  TENANT_SETTING_KEY_MAIL,
  type MailDriver,
  type MailerConfigStatus,
  type MailerConfigWriteBody,
} from "../shared/index.js";

/** TenantSetting.value 里存的公开字段（不含密码）。 */
interface MailPublicValue {
  driver: MailDriver | null;
  from: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_user: string | null;
}

const EMPTY_PUBLIC: MailPublicValue = {
  driver: null,
  from: null,
  smtp_host: null,
  smtp_port: null,
  smtp_secure: null,
  smtp_user: null,
};

export interface ResolvedMailConfig {
  driver: MailDriver | null;
  from: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
  };
  source: "tenant" | "platform" | null;
}

interface StoredRow {
  password: string | null;
  publicValue: MailPublicValue;
}

function parsePublicValue(raw: unknown): MailPublicValue {
  if (!raw || typeof raw !== "object") return { ...EMPTY_PUBLIC };
  const value = raw as Record<string, unknown>;
  const driver = value.driver;
  return {
    driver: driver === "smtp" || driver === "log" ? driver : null,
    from: typeof value.from === "string" ? value.from : null,
    smtp_host: typeof value.smtp_host === "string" ? value.smtp_host : null,
    smtp_port:
      typeof value.smtp_port === "number" && Number.isInteger(value.smtp_port)
        ? value.smtp_port
        : null,
    smtp_secure:
      typeof value.smtp_secure === "boolean" ? value.smtp_secure : null,
    smtp_user: typeof value.smtp_user === "string" ? value.smtp_user : null,
  };
}

function decryptStored(cipher: string | null | undefined): string | null {
  const trimmed = cipher?.trim();
  if (!trimmed) return null;
  try {
    return decryptTenantSecret(trimmed).trim() || null;
  } catch {
    // 解不开就当没配（换过 TENANT_SECRET_ENCRYPTION_KEY 会走到这里）
    return null;
  }
}

async function readStored(tenantId: string): Promise<StoredRow> {
  try {
    const row = await prisma.tenantSetting.findUnique({
      where: { tenant_id_key: { tenant_id: tenantId, key: TENANT_SETTING_KEY_MAIL } },
      select: { secret: true, value: true },
    });
    return {
      password: decryptStored(row?.secret),
      publicValue: parsePublicValue(row?.value),
    };
  } catch (err) {
    // 迁移还没跑到时表可能不存在——当没配，别让整个进程起不来
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2021"
    ) {
      return { password: null, publicValue: { ...EMPTY_PUBLIC } };
    }
    throw err;
  }
}

export async function resolveMailConfig(
  tenantId: string,
): Promise<ResolvedMailConfig> {
  const stored = await readStored(tenantId);
  const platform = config.mail;
  const tenant = stored.publicValue;

  const driver = tenant.driver ?? (platform.driver || null);
  const resolved: ResolvedMailConfig = {
    driver: driver === "smtp" || driver === "log" ? driver : null,
    from: tenant.from ?? platform.from,
    smtp: {
      host: tenant.smtp_host ?? platform.smtp.host,
      port: tenant.smtp_port ?? platform.smtp.port,
      secure: tenant.smtp_secure ?? platform.smtp.secure,
      user: tenant.smtp_user ?? platform.smtp.user,
      password: stored.password ?? platform.smtp.password,
    },
    /*
     * 只要本站动过任意一个字段就算 tenant 来源——设置页据此显示「本站覆盖」，
     * 让站长知道自己在看的不是平台默认。
     */
    source: null,
  };
  const hasTenantOverride =
    Object.values(tenant).some((v) => v !== null) || stored.password !== null;
  resolved.source = isUsable(resolved)
    ? hasTenantOverride
      ? "tenant"
      : "platform"
    : null;
  return resolved;
}

/**
 * 能不能真的发出去。
 *
 * `log` driver 只要有发件人就成立（它不出网）；`smtp` 还要有主机。
 * 用户名密码**不强制**：内网中继常常是匿名的，强制反而卡住合法配置。
 */
export function isUsable(resolved: ResolvedMailConfig): boolean {
  if (!resolved.driver) return false;
  if (!resolved.from.trim()) return false;
  if (resolved.driver === "smtp" && !resolved.smtp.host.trim()) return false;
  return true;
}

export async function getMailerConfigStatus(
  tenantId: string,
): Promise<MailerConfigStatus> {
  const stored = await readStored(tenantId);
  const resolved = await resolveMailConfig(tenantId);
  const tenant = stored.publicValue;
  return {
    configured: isUsable(resolved),
    source: resolved.source,

    // 本站覆盖的原值：设置页拿它预填，null 的字段留空表示「跟随平台」
    driver: tenant.driver,
    from: tenant.from,
    smtp_host: tenant.smtp_host,
    smtp_port: tenant.smtp_port,
    smtp_secure: tenant.smtp_secure,
    smtp_user: tenant.smtp_user,
    /*
     * 只提示**本站存的**密码。回落平台时若显示平台密码的尾码，
     * 清空本站覆盖后看起来像「没清掉」——LLM 设置页踩过同一个坑。
     */
    smtp_password_hint: stored.password ? maskApiKeyHint(stored.password) : null,

    // 实际生效值：设置页拿它做 placeholder，状态卡拿它显示「现在到底在用什么」
    resolved_driver: resolved.driver,
    resolved_from: resolved.from || null,
    resolved_smtp_host: resolved.smtp.host || null,
    resolved_smtp_port: resolved.smtp.port,
    resolved_smtp_secure: resolved.smtp.secure,
    resolved_smtp_user: resolved.smtp.user || null,
  };
}

export async function updateMailerConfig(
  tenantId: string,
  body: MailerConfigWriteBody,
): Promise<MailerConfigStatus> {
  const stored = await readStored(tenantId);
  const nextPublic = mergePublicValue(stored.publicValue, body);
  const nextPassword = nextSecret(stored.password, body.smtp_password);

  const emptied =
    !nextPassword && Object.values(nextPublic).every((v) => v === null);
  if (emptied) {
    // 全清空就把整行删掉，而不是留一行全 null——留着会让「有没有本站覆盖」变得模棱两可
    await prisma.tenantSetting.deleteMany({
      where: { tenant_id: tenantId, key: TENANT_SETTING_KEY_MAIL },
    });
    return getMailerConfigStatus(tenantId);
  }

  await prisma.tenantSetting.upsert({
    where: { tenant_id_key: { tenant_id: tenantId, key: TENANT_SETTING_KEY_MAIL } },
    create: {
      tenant_id: tenantId,
      key: TENANT_SETTING_KEY_MAIL,
      value: nextPublic as unknown as Prisma.InputJsonValue,
      secret: nextPassword ? encryptTenantSecret(nextPassword) : null,
    },
    update: {
      value: nextPublic as unknown as Prisma.InputJsonValue,
      secret: nextPassword ? encryptTenantSecret(nextPassword) : null,
    },
  });

  return getMailerConfigStatus(tenantId);
}

/** 字段缺省 = 不动；显式 null / 空串 = 清掉本站覆盖，回落平台默认。 */
function mergePublicValue(
  stored: MailPublicValue,
  body: MailerConfigWriteBody,
): MailPublicValue {
  return {
    driver:
      body.driver === undefined ? stored.driver : parseDriver(body.driver),
    from: body.from === undefined ? stored.from : blankToNull(body.from),
    smtp_host:
      body.smtp_host === undefined
        ? stored.smtp_host
        : blankToNull(body.smtp_host),
    smtp_port:
      body.smtp_port === undefined ? stored.smtp_port : parsePort(body.smtp_port),
    smtp_secure:
      body.smtp_secure === undefined ? stored.smtp_secure : body.smtp_secure,
    smtp_user:
      body.smtp_user === undefined
        ? stored.smtp_user
        : blankToNull(body.smtp_user),
  };
}

function nextSecret(
  stored: string | null,
  incoming: string | null | undefined,
): string | null {
  if (incoming === undefined) return stored;
  return incoming === null ? null : incoming.trim() || null;
}

function blankToNull(raw: string | null): string | null {
  if (raw === null) return null;
  if (typeof raw !== "string") throw new ValidationError("mailer.field_invalid");
  return raw.trim() || null;
}

function parseDriver(raw: MailDriver | null): MailDriver | null {
  if (raw === null) return null;
  if (raw !== "smtp" && raw !== "log") {
    throw new ValidationError("mailer.driver_invalid");
  }
  /*
   * 生产不许租户把自己切到 log：那等于「所有信静默消失」，而站长在设置页上
   * 看到的仍是「已配置」。平台 env 那边同样有这道闸（buildMailConfig）。
   */
  if (raw === "log" && config.server.isProduction) {
    throw new ValidationError("mailer.driver_log_forbidden");
  }
  return raw;
}

function parsePort(raw: number | null): number | null {
  if (raw === null) return null;
  if (!Number.isInteger(raw) || raw < 1 || raw > 65535) {
    throw new ValidationError("mailer.smtp_port_invalid");
  }
  return raw;
}
