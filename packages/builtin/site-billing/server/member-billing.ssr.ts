/**
 * 「我的订阅与付款」页（`/member/billing`）：**SSR + 真表单 POST**。
 *
 * 与会员的登录 / 注册 / 账户三张页面同一条链路，理由也一样：版式归租户（这是一张
 * 模板页，能在 Theme Editor 里排），交互不依赖 bundle（下单与取消都是真 `<form>`）。
 *
 * 一张页面两种提交，靠隐藏字段 `intent` 分流：
 *
 * | intent   | 做什么       | 之后去哪                           |
 * | -------- | ------------ | ---------------------------------- |
 * | checkout | 开一次结账   | 303 去通道的收银台                 |
 * | cancel   | 周期末取消   | 303 回本页，带 `?canceled=1`       |
 *
 * `intent=checkout` 的表单也可能来自**别的页面**上的 `site-billing.plans` 段
 *（定价页通常不是这一张），所以 action 固定写死本页地址。
 */

import { AppError } from "@rewindom/server-kernel/lib/app-errors.js";
import { resolveRequestLocale } from "@rewindom/server-kernel/lib/i18n/translate.js";
import { normalizeLocale, type AppLocale } from "@rewindom/shared";

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
import {
  assertSameOrigin,
  ensureHostTenant,
  errorMessage,
  formBodyParser,
  requestOrigin,
  sendHtml,
} from "../../site-member/server/member-ssr-common.js";
import { resolveMemberSsrSession } from "../../site-member/server/site-member-ssr-session.js";
import { MEMBER_BILLING_PAGE_KIND } from "../shared/account-section.js";
import { MEMBER_BILLING_TEMPLATE_PRESET } from "../shared/member-billing-templates.js";
import {
  MEMBER_BILLING_PATH,
  parseMemberBillingIntent,
  siteBillingContextEntry,
  type SiteBillingRenderContext,
} from "../shared/plans-section.js";
import { formatMemberPrice } from "../shared/site-billing.js";

import { isSiteBillingEnabled } from "./entitlement.js";
import {
  cancelMemberSubscription,
  createMemberCheckout,
  getMemberSubscription,
  listOwnPayments,
  listPurchasablePlans,
} from "./member-billing.service.js";
import { createSiteBillingTranslator } from "./site-billing-i18n.js";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const LOGIN_PATH = "/member/login";

/** 未登录访客点「订阅」时送去登录，并带上「回这儿」。 */
const LOGIN_WITH_REDIRECT = `${LOGIN_PATH}?redirect=${encodeURIComponent(
  MEMBER_BILLING_PATH,
)}`;

interface PageState {
  status: number;
  error: string | null;
  /** 成功提示的 i18n key（不是成句）：翻译发生在渲染里，那里才知道**站点**的语言。 */
  noticeKey: string | null;
}

function formatMoment(
  value: string | null,
  locale: AppLocale,
  fallback: string,
): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    dateStyle: "medium",
  }).format(date);
}

/**
 * 渲染账单页。
 *
 * @returns 已登录并渲染完成为 `true`；未登录时**不渲染**，由调用方送去登录页。
 */
async function renderBillingPage(
  request: FastifyRequest,
  reply: FastifyReply,
  state: PageState,
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

  if (!(await isSiteBillingEnabled(hostTenant.tenant_id))) {
    sendHtml(
      reply,
      404,
      renderUnavailableHtml({
        title: "Not found",
        message: "This page is not available.",
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

  const requested = resolveRequestLocale(request);
  const site = await getSiteChromeOrFallback(
    hostTenant.tenant_id,
    hostTenant.tenant_slug,
    hostTenant.tenant_slug,
    requested,
  );
  const locale = normalizeLocale(site.locale, site.default_locale);
  const fallbackLocale = normalizeLocale(site.default_locale);
  const translate = createSiteBillingTranslator(locale);

  const [plans, subscription, payments, stored, accountEntry, entitlements] =
    await Promise.all([
      listPurchasablePlans({
        tenant_id: hostTenant.tenant_id,
        locale,
        fallback_locale: fallbackLocale,
      }),
      getMemberSubscription({
        tenant_id: hostTenant.tenant_id,
        member_id: session.id,
      }),
      listOwnPayments({
        tenant_id: hostTenant.tenant_id,
        member_id: session.id,
      }),
      getPublishedTemplatePage(
        hostTenant.tenant_id,
        MEMBER_BILLING_PAGE_KIND,
        locale,
        // 账单是会员的自助入口：站点没发布时也要能看到、能取消
        { requireSite: false },
      ),
      resolveSiteAccountEntry({ tenantId: hostTenant.tenant_id, locale }),
      resolveSectionEntitlements(hostTenant.tenant_id),
    ]);

  const template = stored ?? {
    sections: buildPresetSections(MEMBER_BILLING_TEMPLATE_PRESET, translate),
    title: translate(MEMBER_BILLING_TEMPLATE_PRESET.titleKey),
    description: translate(MEMBER_BILLING_TEMPLATE_PRESET.descriptionKey),
  };

  const dash = translate("account.empty");
  const currentPlan = plans.find((plan) => plan.slug === subscription?.plan_slug);

  const context: SiteBillingRenderContext = {
    plans,
    subscription,
    subscription_interval: currentPlan?.interval ?? null,
    action: MEMBER_BILLING_PATH,
    login_href: LOGIN_WITH_REDIRECT,
    signed_in: true,
    error: state.error,
    notice: state.noticeKey ? translate(state.noticeKey) : null,
    price_labels: Object.fromEntries(
      plans.map((plan) => [
        plan.id,
        formatMemberPrice(plan.price_cents, plan.currency, locale),
      ]),
    ),
    interval_labels: {
      month: translate("interval.month"),
      year: translate("interval.year"),
      onetime: translate("interval.onetime"),
    },
    account_rows: subscription
      ? [
          {
            label: translate("account.planLabel"),
            value: currentPlan?.name ?? subscription.plan_slug,
          },
          {
            label: translate("account.statusLabel"),
            value: translate(`status.${subscription.status}`),
          },
          {
            label: translate("account.periodEndLabel"),
            value: formatMoment(subscription.current_period_end, locale, dash),
          },
          {
            label: translate("account.cancelAtPeriodEndLabel"),
            value: subscription.cancel_at_period_end
              ? translate("account.yes")
              : translate("account.no"),
          },
        ]
      : [],
    payments: payments.map((payment) => ({
      time: formatMoment(payment.paid_at ?? payment.created_at, locale, dash),
      plan: payment.plan_slug ?? dash,
      amount: formatMemberPrice(payment.amount_cents, payment.currency, locale),
      status: translate(`paymentStatus.${payment.status}`),
    })),
  };

  sendHtml(
    reply,
    state.status,
    renderMarketingHtml({
      origin: requestOrigin(request),
      site,
      page: {
        slug: MEMBER_BILLING_PATH,
        locale,
        kind: MEMBER_BILLING_PAGE_KIND,
        title: template.title,
        description: template.description,
        sections: template.sections,
        // 账单页对搜索引擎没有内容，收录它只会把登录墙送进搜索结果
        settings: { noindex: true },
        visibility: "public",
        path: MEMBER_BILLING_PATH,
        alternates: [],
        updated_at: new Date().toISOString(),
      },
      accountEntryHtml: accountEntry.html,
      enabledEntitlements: entitlements,
      contributed: siteBillingContextEntry(context),
    }),
  );
  return true;
}

function redirectTo(reply: FastifyReply, target: string, status = 302): void {
  void reply
    .header("cache-control", "private, no-store")
    .redirect(target, status);
}

async function handleSubmit(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const intent = parseMemberBillingIntent(body.intent);

  try {
    assertSameOrigin(request);
    await ensureHostTenant(request);
    const hostTenant = request.hostTenantContext;
    if (!hostTenant) {
      redirectTo(reply, LOGIN_WITH_REDIRECT, 303);
      return;
    }

    if (!(await isSiteBillingEnabled(hostTenant.tenant_id))) {
      sendHtml(
        reply,
        404,
        renderUnavailableHtml({
          title: "Not found",
          message: "This page is not available.",
        }),
      );
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

    if (intent === "cancel") {
      await cancelMemberSubscription({
        tenant_id: hostTenant.tenant_id,
        member_id: session.id,
      });
      redirectTo(reply, `${MEMBER_BILLING_PATH}?canceled=1`, 303);
      return;
    }

    const planSlug = typeof body.plan_slug === "string" ? body.plan_slug : "";
    if (!planSlug) {
      throw new AppError({ code: "site_billing.plan_required", status: 400 });
    }

    const { checkout_url } = await createMemberCheckout({
      tenant_id: hostTenant.tenant_id,
      member_id: session.id,
      member_email: session.email,
      plan_slug: planSlug,
      origin: requestOrigin(request),
      return_path: MEMBER_BILLING_PATH,
    });

    /*
     * 通道的收银台是**站外**地址，`safeRedirect` 那套「只认站内相对路径」在这里
     * 不适用——它是防开放重定向的，而这个 URL 是我们自己刚从通道拿到的。
     */
    redirectTo(reply, checkout_url, 303);
  } catch (error) {
    const requested = resolveRequestLocale(request);
    const rendered = await renderBillingPage(request, reply, {
      status: error instanceof AppError ? error.status : 500,
      error: errorMessage(error, requested),
      noticeKey: null,
    });
    if (!rendered) redirectTo(reply, LOGIN_WITH_REDIRECT, 303);
  }
}

export async function memberBillingPageRoutes(
  app: FastifyInstance,
): Promise<void> {
  formBodyParser(app);

  app.get(MEMBER_BILLING_PATH, async (request, reply) => {
    const query = request.query as
      | { canceled?: string; checkout?: string }
      | undefined;
    const rendered = await renderBillingPage(request, reply, {
      status: 200,
      error: null,
      noticeKey: query?.canceled
        ? "account.cancelScheduled"
        : query?.checkout === "success"
          ? // 回跳先到、webhook 后到是常态：说清楚「在处理」，别让人以为没付上
            "account.checkoutPending"
          : null,
    });
    if (!rendered) redirectTo(reply, LOGIN_WITH_REDIRECT);
  });

  app.post(MEMBER_BILLING_PATH, async (request, reply) => {
    await handleSubmit(request, reply);
  });
}
