/**
 * 会员登录 / 注册页：**SSR + 真表单 POST**。
 *
 * 这两页以前是 React SPA 路由。改成 SSR 有两个理由，顺序不能颠倒：
 *
 * 1. **版式归租户**。它们现在是两张模板页（`member_login` / `member_register`），
 *    与文档库那两张同一套机制——租户在 Theme Editor 里排，套自己的页头页脚与主题。
 * 2. **认证是入口，不该依赖 bundle**。表单是真 `<form method="post">`：没有 JS 也
 *    登录得了。只有平台开了滑块验证码时才需要 JS（拖动没有无 JS 的等价物）。
 *
 * 路由是**静态**的（`/member/login`），比 marketing SSR 的 `/:first/:second` 更具体，
 * find-my-way 优先匹配到这里。账户页同一条链路，在 `member-account.ssr.ts`；
 * `/member/oauth/callback` 没有版式可言，仍落到 SPA 兜底。
 */

import { CaptchaService } from "@be-water/server-kernel/kernel/auth/captcha.service.js";
import { resolveOAuthEnabledFlags } from "@be-water/server-kernel/kernel/auth/oauth-credentials.js";
import { AppError } from "@be-water/server-kernel/lib/app-errors.js";
import { resolveRequestLocale } from "@be-water/server-kernel/lib/i18n/translate.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { normalizeLocale } from "@be-water/shared";

import { AuditAction } from "../../audit/shared/index.js";
import { resolveSiteAccountEntry } from "../../marketing/server/site-account-entry.js";
import { resolveSectionEntitlements } from "../../marketing/server/site-entitlements.js";
import {
  getPublishedTemplatePage,
  getSiteChromeOrFallback,
} from "../../marketing/server/site.service.js";
import {
  renderMarketingHtml,
  renderUnavailableHtml,
} from "../../marketing/server/ssr-render.js";
import { buildPresetSections } from "../../marketing/shared/page-presets.js";
import { getPlatformSettings } from "../../platform/server/services/platform-settings.service.js";
import { MEMBER_ACCOUNT_PATH } from "../shared/member-account-section.js";
import {
  MEMBER_LOGIN_PAGE_KIND,
  MEMBER_LOGIN_PATH,
  MEMBER_REGISTER_PAGE_KIND,
  MEMBER_REGISTER_PATH,
  memberAuthContextEntry,
  type MemberAuthRenderContext,
} from "../shared/member-auth-section.js";
import {
  MEMBER_LOGIN_TEMPLATE_PRESET,
  MEMBER_REGISTER_TEMPLATE_PRESET,
} from "../shared/member-page-templates.js";

import { setMemberAuthCookies } from "./member-auth-cookies.js";
import { createMemberPresetTranslator } from "./member-preset-i18n.js";
import {
  assertSameOrigin,
  ensureHostTenant,
  errorMessage,
  formBodyParser,
  requestOrigin,
  safeRedirect,
  sendHtml,
} from "./member-ssr-common.js";
import { SiteMemberAuthService } from "./site-member-auth.service.js";
import { resolveMemberSsrSession } from "./site-member-ssr-session.js";
import { hasSiteForHost, resolveSiteTenant } from "./site-member-tenant.js";


import type { PagePreset } from "../../marketing/shared/page-presets.types.js";
import type { SiteMemberCaptchaInput } from "../shared/site-member.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

type AuthMode = "login" | "register";

interface AuthPageSpec {
  mode: AuthMode;
  kind: string;
  path: string;
  altPath: string;
  preset: PagePreset;
}

const SPECS: Record<AuthMode, AuthPageSpec> = {
  login: {
    mode: "login",
    kind: MEMBER_LOGIN_PAGE_KIND,
    path: MEMBER_LOGIN_PATH,
    altPath: MEMBER_REGISTER_PATH,
    preset: MEMBER_LOGIN_TEMPLATE_PRESET,
  },
  register: {
    mode: "register",
    kind: MEMBER_REGISTER_PAGE_KIND,
    path: MEMBER_REGISTER_PATH,
    altPath: MEMBER_LOGIN_PATH,
    preset: MEMBER_REGISTER_TEMPLATE_PRESET,
  },
};

/** 表单里的验证码：增强脚本写进隐藏字段的 JSON 串。 */
function parseCaptchaField(raw: unknown): SiteMemberCaptchaInput | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as SiteMemberCaptchaInput;
  } catch {
    return null;
  }
}

async function assertCaptchaIfRequired(
  captcha: SiteMemberCaptchaInput | null,
): Promise<void> {
  const settings = await getPlatformSettings();
  if (!settings.captcha_enabled) return;
  if (
    !captcha ||
    typeof captcha.id !== "string" ||
    typeof captcha.token !== "string" ||
    typeof captcha.x !== "number" ||
    typeof captcha.y !== "number"
  ) {
    throw new AppError({ code: "auth.captcha_required", status: 400 });
  }
  if (!CaptchaService.verify(captcha)) {
    throw new AppError({ code: "auth.captcha_invalid", status: 400 });
  }
}

/**
 * 渲染一张认证页。
 *
 * 版式取自模板页：租户自定义过就用它的，没有就用内置预设——与文档模板页同口径，
 * 「不存在」是常态而不是异常（见 `page-templates.ts` 的懒落库）。
 */
async function renderAuthPage(
  request: FastifyRequest,
  reply: FastifyReply,
  spec: AuthPageSpec,
  state: { status: number; error: string | null; email: string },
): Promise<void> {
  await ensureHostTenant(request);
  const hostTenant = request.hostTenantContext;
  if (!hostTenant) {
    sendHtml(
      reply,
      404,
      renderUnavailableHtml({
        title: "Site not found",
        message: "This host is not bound to a site.",
      }),
    );
    return;
  }

  const enabled = hasSiteForHost(hostTenant);
  if (!enabled) {
    sendHtml(
      reply,
      404,
      renderUnavailableHtml({
        title: "Not available",
        message: "Memberships are not enabled for this site.",
      }),
    );
    return;
  }

  const requested = resolveRequestLocale(request);
  const site = await getSiteChromeOrFallback(
    hostTenant.tenant_id,
    hostTenant.tenant_slug,
    hostTenant.tenant_slug,
    requested,
  );
  const locale = normalizeLocale(site.locale, site.default_locale);

  const stored = await getPublishedTemplatePage(
    hostTenant.tenant_id,
    spec.kind,
    locale,
    // 登录页是入口不是内容：站点没发布时也要能登录，那时用兜底版式
    { requireSite: false },
  );
  const translate = createMemberPresetTranslator(locale);
  const template = stored ?? {
    sections: buildPresetSections(spec.preset, translate),
    title: translate(spec.preset.titleKey),
    description: translate(spec.preset.descriptionKey),
  };

  const redirect = safeRedirect(
    (request.query as { redirect?: string } | undefined)?.redirect,
    MEMBER_ACCOUNT_PATH,
  );
  const redirectQuery = `?redirect=${encodeURIComponent(redirect)}`;
  const [accountEntry, entitlements, platformSettings, oauthFlags] =
    await Promise.all([
      resolveSiteAccountEntry({ tenantId: hostTenant.tenant_id, locale }),
      resolveSectionEntitlements(hostTenant.tenant_id),
      getPlatformSettings(),
      resolveOAuthEnabledFlags(hostTenant.tenant_id),
    ]);

  const authContext: MemberAuthRenderContext = {
    action: `${spec.path}${redirectQuery}`,
    redirect,
    alt_href: `${spec.altPath}${redirectQuery}`,
    captcha_enabled: platformSettings.captcha_enabled,
    github_oauth_enabled: oauthFlags.github_oauth_enabled,
    google_oauth_enabled: oauthFlags.google_oauth_enabled,
    microsoft_oauth_enabled: oauthFlags.microsoft_oauth_enabled,
    error: state.error,
    email: state.email,
    captcha_challenge_path: "/api/captcha/challenge",
  };

  sendHtml(
    reply,
    state.status,
    renderMarketingHtml({
      origin: requestOrigin(request),
      site,
      page: {
        slug: spec.path,
        locale,
        kind: spec.kind,
        title: template.title,
        description: template.description,
        sections: template.sections,
        // 认证页不该被收录：它对搜索引擎没有内容，收进去只会分走登录入口的权重
        settings: { noindex: true },
        visibility: "public",
        path: spec.path,
        alternates: [],
        updated_at: new Date().toISOString(),
      },
      accountEntryHtml: accountEntry.html,
      enabledEntitlements: entitlements,
      contributed: memberAuthContextEntry(authContext),
    }),
  );
}

/** 已登录的会员不该再看见登录页（同 SPA 时代 `GuestOnlyRoute` 的口径）。 */
async function redirectIfSignedIn(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  const hostTenant = request.hostTenantContext;
  if (!hostTenant) return false;
  const member = await resolveMemberSsrSession({
    request,
    reply,
    tenantId: hostTenant.tenant_id,
  });
  if (!member) return false;
  const redirect = safeRedirect(
    (request.query as { redirect?: string } | undefined)?.redirect,
    MEMBER_ACCOUNT_PATH,
  );
  void reply.header("cache-control", "private, no-store").redirect(redirect);
  return true;
}

async function handleSubmit(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  spec: AuthPageSpec,
): Promise<void> {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName =
    typeof body.display_name === "string" ? body.display_name.trim() : "";
  const redirect = safeRedirect(body.redirect, MEMBER_ACCOUNT_PATH);

  try {
    assertSameOrigin(request);
    await ensureHostTenant(request);
    await assertCaptchaIfRequired(parseCaptchaField(body.captcha));
    const tenant = await resolveSiteTenant(request.hostTenantContext ?? null);

    const result =
      spec.mode === "login"
        ? await SiteMemberAuthService.login(
            { email, password },
            tenant,
            app.jwt.sign.bind(app.jwt),
          )
        : await SiteMemberAuthService.register(
            {
              email,
              password,
              ...(displayName ? { display_name: displayName } : {}),
            },
            tenant,
            app.jwt.sign.bind(app.jwt),
          );

    if (spec.mode === "register") {
      // AuditLog.user_id 外键指向 User 表，会员 id 放进去会违反约束（同 JSON 接口）
      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        username: result.member.email,
        action: AuditAction.SITE_MEMBER_REGISTER,
        resource: `site_member:${result.member.id}`,
        detail_key: "site_member.audit.registered",
        detail_params: { email: result.member.email },
        tenant_slug: tenant.slug,
      });
    }

    setMemberAuthCookies(reply, result.tokens);
    /*
     * 303 而不是 302：POST 之后必须让浏览器改用 GET 打开目标页，否则刷新会重放提交。
     */
    void reply
      .header("cache-control", "private, no-store")
      .redirect(redirect, 303);
  } catch (error) {
    const locale = resolveRequestLocale(request);
    app.log.warn({ err: error }, "[member-auth] 表单提交失败");
    await renderAuthPage(request, reply, spec, {
      status: error instanceof AppError ? error.status : 400,
      error: errorMessage(error, locale),
      // 密码打错不该连邮箱一起重打；密码本身当然不回填
      email,
    });
  }
}

/**
 * 挂在**根路径**上（不带 `/api` 前缀）：它们是页面，不是接口。
 *
 * 表单 body 是 `application/x-www-form-urlencoded`，Fastify 默认只认 JSON——
 * 解析器登记在这个封装作用域里，不影响其它路由。
 */
export async function memberAuthPageRoutes(
  app: FastifyInstance,
): Promise<void> {
  formBodyParser(app);

  for (const spec of Object.values(SPECS)) {
    app.get(spec.path, async (request, reply) => {
      await ensureHostTenant(request);
      if (await redirectIfSignedIn(request, reply)) return;
      await renderAuthPage(request, reply, spec, {
        status: 200,
        error: null,
        email: "",
      });
    });

    app.post(spec.path, async (request, reply) => {
      await handleSubmit(app, request, reply, spec);
    });
  }
}
