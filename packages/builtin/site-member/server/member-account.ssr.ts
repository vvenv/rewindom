/**
 * 「我的账户」页：**SSR + 真表单 POST**，与登录 / 注册同一条链路。
 *
 * 这一页以前是 SPA 路由，套的是 site-member 自己的中性外壳：没有站点页头页脚，
 * 也进不了 Theme Editor。访客刚在某个租户的站上登录，一跳过来就掉进一张白页——
 * 视觉上像是离开了这个站。改成模板页（`member_account`）之后，它与站点其余页面
 * 用同一套 chrome、同一套主题，站长还能在面板上下摞自己的段（会员权益、公告）。
 *
 * 一张页面三张表单，靠隐藏字段 `intent` 分流：
 *
 * | intent   | 做什么     | 之后去哪                                  |
 * | -------- | ---------- | ----------------------------------------- |
 * | profile  | 改昵称     | 303 回本页，带 `?saved=1` 出一句「已保存」 |
 * | password | 改密码     | 清 cookie → 303 去登录页（改密即下线）     |
 * | logout   | 退出登录   | 清 cookie → 303 回首页                     |
 *
 * 全都是 POST-重定向-GET：不这么做，刷新一次就重放上一次提交。
 */

import { AppError } from "@rewindom/server-kernel/lib/app-errors.js";
import { normalizeLocale, type AppLocale  } from "@rewindom/shared";

import { resolveSiteAccountEntry } from "../../marketing/server/site-account-entry.js";
import { resolveSectionEntitlements } from "../../marketing/server/site-entitlements.js";
import {
  getPublishedTemplatePage,
  getSiteChromeOrFallback,
  resolveVisitorPageLocale,
} from "../../marketing/server/site.service.js";
import {
  renderMarketingHtml,
  renderUnavailableHtml,
} from "../../marketing/server/ssr-render.js";
import { buildPresetSections } from "../../marketing/shared/page-presets.js";
import { parseMarketingSsrPath } from "../../marketing/shared/site-locale.js";
import {
  MEMBER_ACCOUNT_PAGE_KIND,
  MEMBER_ACCOUNT_PATH,
  memberAccountContextEntry,
  parseMemberAccountIntent,
  type MemberAccountIntent,
  type MemberAccountRenderContext,
} from "../shared/member-account-section.js";
import { MEMBER_LOGIN_PATH } from "../shared/member-auth-section.js";
import { MEMBER_ACCOUNT_TEMPLATE_PRESET } from "../shared/member-page-templates.js";

import {
  clearMemberAuthCookies,
  readMemberRefreshCookie,
} from "./member-auth-cookies.js";
import { createMemberPresetTranslator } from "./member-preset-i18n.js";
import {
  assertSameOrigin,
  ensureHostTenant,
  errorMessage,
  formBodyParser,
  requestOrigin,
  sendHtml,
} from "./member-ssr-common.js";
import { SiteMemberAuthService } from "./site-member-auth.service.js";
import { resolveMemberSsrSession } from "./site-member-ssr-session.js";
import { isSiteMemberEnabledForHost } from "./site-member-tenant.js";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/** 未登录访客不该看见账户页，送去登录并带上「回这儿」。 */
const LOGIN_WITH_REDIRECT = `${MEMBER_LOGIN_PATH}?redirect=${encodeURIComponent(
  MEMBER_ACCOUNT_PATH,
)}`;

interface AccountState {
  status: number;
  error: string | null;
  /**
   * 成功提示的 i18n key（不是成句）。
   *
   * 翻译发生在渲染里：那里才知道**站点**的语言，而提示是给访客看的——按请求头的
   * `Accept-Language` 翻，就会在一个中文站上冒出一句英文。
   */
  noticeKey: string | null;
  /**
   * 这一次渲染是哪张表单打回来的。
   *
   * 只为一件事：改密码填错了要展开着那一块回来（见 `member-account-section.ts`）。
   */
  intent: MemberAccountIntent | null;
}

/**
 * 时间戳 → 访客语言下的一句日期。
 *
 * 用 `Intl` 而不是 `toLocaleString()` 的默认行为：服务端进程的 locale 是部署环境
 * 决定的，与访客毫无关系——同一张页面在两台机器上会显示两种格式。
 */
function formatMoment(
  value: Date | string | null | undefined,
  locale: AppLocale,
  fallback: string,
): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * 渲染账户页。
 *
 * 版式取自模板页：租户自定义过就用它的，没有就用内置预设——与登录页同口径，
 * 「不存在」是常态而不是异常（见 `page-templates.ts` 的懒落库）。
 *
 * @returns 已登录并渲染完成为 `true`；未登录时**不渲染**，由调用方送去登录页。
 */
async function renderAccountPage(
  request: FastifyRequest,
  reply: FastifyReply,
  state: AccountState,
): Promise<boolean> {
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
    return true;
  }

  const enabled = await isSiteMemberEnabledForHost(hostTenant);
  if (!enabled) {
    sendHtml(
      reply,
      404,
      renderUnavailableHtml({
        title: "Not available",
        message: "Memberships are not enabled for this site.",
      }),
    );
    return true;
  }

  const session = await resolveMemberSsrSession({
    request,
    reply,
    tenantId: hostTenant.tenant_id,
  });
  if (!session) return false;

  const requested = parseMarketingSsrPath(request.url).locale;
  const site = await getSiteChromeOrFallback(
    hostTenant.tenant_id,
    hostTenant.tenant_slug,
    hostTenant.tenant_slug,
    requested,
  );
  const locale = normalizeLocale(requested, site.default_locale);
  const translate = createMemberPresetTranslator(locale);

  const [profile, stored, accountEntry, entitlements] = await Promise.all([
    SiteMemberAuthService.getProfile(session.id, hostTenant.tenant_id),
    getPublishedTemplatePage(
      hostTenant.tenant_id,
      MEMBER_ACCOUNT_PAGE_KIND,
      locale,
      // 账户页是会员的自助入口：站点没发布时也要能改密码、能退出
      { requireSite: false },
    ),
    resolveSiteAccountEntry({ tenantId: hostTenant.tenant_id, locale }),
    resolveSectionEntitlements(hostTenant.tenant_id),
  ]);

  const template = stored ?? {
    sections: buildPresetSections(MEMBER_ACCOUNT_TEMPLATE_PRESET, translate),
    title: translate(MEMBER_ACCOUNT_TEMPLATE_PRESET.titleKey),
    description: translate(MEMBER_ACCOUNT_TEMPLATE_PRESET.descriptionKey),
  };

  const never = translate("account.never");
  const accountContext: MemberAccountRenderContext = {
    action: MEMBER_ACCOUNT_PATH,
    email: profile.email,
    display_name: profile.display_name,
    created_at: formatMoment(profile.created_at, locale, never),
    last_login_at: formatMoment(profile.last_login_at, locale, never),
    error: state.error,
    notice: state.noticeKey ? translate(state.noticeKey) : null,
    intent: state.intent,
  };

  sendHtml(
    reply,
    state.status,
    renderMarketingHtml({
      origin: requestOrigin(request),
      tenant_id: hostTenant.tenant_id,
      tenant_slug: hostTenant.tenant_slug,
      site,
      page: {
        slug: MEMBER_ACCOUNT_PATH,
        locale,
        kind: MEMBER_ACCOUNT_PAGE_KIND,
        title: template.title,
        description: template.description,
        sections: template.sections,
        // 账户页对搜索引擎没有内容，收录它只会把登录墙送进搜索结果
        settings: { noindex: true },
        visibility: "public",
        path: MEMBER_ACCOUNT_PATH,
        alternates: [],
        updated_at: new Date().toISOString(),
      },
      accountEntryHtml: accountEntry.html,
      enabledEntitlements: entitlements,
      contributed: memberAccountContextEntry(accountContext),
    }),
  );
  return true;
}

function redirectTo(reply: FastifyReply, target: string, status = 302): void {
  void reply
    .header("cache-control", "private, no-store")
    .redirect(target, status);
}

/** 改密码：两次新密码必须一致——这一条前端做不到就得服务端做，而这里没有前端。 */
function assertPasswordConfirmed(body: Record<string, unknown>): void {
  const next = typeof body.new_password === "string" ? body.new_password : "";
  const confirm =
    typeof body.confirm_password === "string" ? body.confirm_password : "";
  if (next !== confirm) {
    throw new AppError({ code: "site_member.password_mismatch", status: 400 });
  }
}

async function handleSubmit(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const body = (request.body ?? {}) as Record<string, unknown>;
  // 认不出的 intent 按「改资料」走：表单坏了也不该把人静默登出
  const intent = parseMemberAccountIntent(body.intent);

  try {
    assertSameOrigin(request);
    await ensureHostTenant(request);
    const hostTenant = request.hostTenantContext;
    if (!hostTenant) {
      redirectTo(reply, MEMBER_LOGIN_PATH, 303);
      return;
    }
    const session = await resolveMemberSsrSession({
      request,
      reply,
      tenantId: hostTenant.tenant_id,
    });
    if (!session) {
      redirectTo(reply, LOGIN_WITH_REDIRECT, 303);
      return;
    }

    if (intent === "logout") {
      const refreshToken = readMemberRefreshCookie(request);
      if (refreshToken) await SiteMemberAuthService.logout(refreshToken);
      clearMemberAuthCookies(reply);
      redirectTo(reply, "/", 303);
      return;
    }

    if (intent === "password") {
      assertPasswordConfirmed(body);
      await SiteMemberAuthService.changePassword(
        session.id,
        hostTenant.tenant_id,
        {
          old_password:
            typeof body.old_password === "string" ? body.old_password : "",
          new_password:
            typeof body.new_password === "string" ? body.new_password : "",
        },
      );
      // 改密即下线：服务端已吊销所有 refresh，本机的 cookie 也不该留着
      clearMemberAuthCookies(reply);
      redirectTo(reply, LOGIN_WITH_REDIRECT, 303);
      return;
    }

    await SiteMemberAuthService.updateProfile(
      session.id,
      hostTenant.tenant_id,
      {
        display_name:
          typeof body.display_name === "string" ? body.display_name : "",
      },
    );
    redirectTo(reply, `${MEMBER_ACCOUNT_PATH}?saved=1`, 303);
  } catch (error) {
    const locale = await resolveVisitorPageLocale(
      request.hostTenantContext?.tenant_id ?? "",
      parseMarketingSsrPath(request.url).locale,
    );
    app.log.warn({ err: error }, "[member-account] 表单提交失败");
    const rendered = await renderAccountPage(request, reply, {
      status: error instanceof AppError ? error.status : 400,
      error: errorMessage(error, locale),
      noticeKey: null,
      intent,
    });
    if (!rendered) redirectTo(reply, LOGIN_WITH_REDIRECT, 303);
  }
}

/**
 * 挂在**根路径**上（不带 `/api` 前缀）：它是页面，不是接口。
 *
 * 静态路径比 marketing SSR 的 catch-all `/*` 更具体，find-my-way 先命中这里。
 */
export async function memberAccountPageRoutes(
  app: FastifyInstance,
): Promise<void> {
  formBodyParser(app);

  app.get(MEMBER_ACCOUNT_PATH, async (request, reply) => {
    const query = request.query as { saved?: string } | undefined;
    const rendered = await renderAccountPage(request, reply, {
      status: 200,
      error: null,
      noticeKey: query?.saved ? "account.saved" : null,
      intent: null,
    });
    if (!rendered) redirectTo(reply, LOGIN_WITH_REDIRECT);
  });

  app.post(MEMBER_ACCOUNT_PATH, async (request, reply) => {
    await handleSubmit(app, request, reply);
  });
}
