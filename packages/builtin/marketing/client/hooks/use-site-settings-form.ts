import { useEffect, useState } from "react";

import { normalizeLocale, type AppLocale } from "@rewindom/shared";

import {
  EMPTY_SITE_ANALYTICS,
  type SiteAnalytics,
  type SiteAnalyticsProvider,
} from "../../shared/site-analytics.js";
import { siteLocaleOrder } from "../../shared/site-locale.js";
import {
  analyticsReady,
  pinToLocale,
  primaryText,
  sameAnalytics,
  sameLocalizedText,
} from "../lib/site-settings-form.js";

import { useSiteMutations } from "./useSite.js";

import type {
  MarketingSite,
  SiteLocalizedText,
  UpdateMarketingSiteBody,
} from "../../shared/site-cms.js";

interface SaveOptions {
  onSuccess?: (saved: MarketingSite) => void;
  onError?: () => void;
}

export type SiteSettingsCommitStatus =
  | "submitted"
  | "noop"
  | "empty_name"
  | "incomplete_analytics";

/**
 * 站点设置的本地草稿。控件只改这一份；点保存才 PATCH。
 *
 * 分析脚本尤其不能「换供应商即存」：Cloudflare 还没填 token 时服务端会把不完整
 * 配置归一成 none，下拉当场弹回关闭。
 *
 * 换主语言仍要先 `pinToLocale`（纯字符串的语言是隐含的），但只钉在这份草稿里，
 * 跟站名同一次请求落库。
 */
export function useSiteSettingsForm(site: MarketingSite | undefined) {
  const { updateSite } = useSiteMutations();

  const savedLocale = normalizeLocale(site?.default_locale);
  const savedAnalytics = site?.analytics ?? EMPTY_SITE_ANALYTICS;

  const [siteName, setSiteName] = useState<SiteLocalizedText>("");
  const [tagline, setTagline] = useState<SiteLocalizedText>("");
  const [defaultLocale, setDefaultLocale] = useState<AppLocale>(savedLocale);
  const [published, setPublished] = useState(false);
  const [homePath, setHomePath] = useState("/");
  const [analytics, setAnalytics] = useState<SiteAnalytics>(
    EMPTY_SITE_ANALYTICS,
  );
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  const hydrateFrom = (next: MarketingSite): void => {
    const locale = normalizeLocale(next.default_locale);
    setSiteName(next.site_name);
    setTagline(next.tagline);
    setDefaultLocale(locale);
    setPublished(next.published);
    setHomePath(next.home_path || "/");
    setAnalytics(next.analytics ?? EMPTY_SITE_ANALYTICS);
    setHydratedKey(next.updated_at);
  };

  useEffect(() => {
    if (!site) return;
    if (hydratedKey === site.updated_at) return;
    /*
     * 打开后只灌一次。Sheet 开着时别的动作（套用首页版式、重定向）也会刷新
     * `updated_at`，不能把未保存草稿冲掉。保存成功走 `hydrateFrom(响应)`。
     */
    if (hydratedKey !== null) return;
    hydrateFrom(site);
  }, [site, hydratedKey]);

  const locales = siteLocaleOrder(defaultLocale);
  const savedLocales = siteLocaleOrder(savedLocale);

  const dirty = Boolean(
    site &&
      hydratedKey !== null &&
      (defaultLocale !== savedLocale ||
        published !== site.published ||
        (homePath || "/") !== (site.home_path || "/") ||
        !sameAnalytics(analytics, savedAnalytics) ||
        !sameLocalizedText(siteName, site.site_name, savedLocales, savedLocale) ||
        !sameLocalizedText(tagline, site.tagline, savedLocales, savedLocale)),
  );

  const reset = (): void => {
    if (!site) return;
    hydrateFrom(site);
  };

  const save = (body: UpdateMarketingSiteBody, options?: SaveOptions): void => {
    updateSite.mutate(body, {
      onSuccess: (saved) => {
        hydrateFrom(saved);
        options?.onSuccess?.(saved);
      },
      onError: options?.onError,
    });
  };

  const commit = (options?: SaveOptions): SiteSettingsCommitStatus => {
    if (!site || updateSite.isPending) return "noop";
    if (!dirty) return "noop";
    if (!primaryText(siteName, defaultLocale)) return "empty_name";
    if (!analyticsReady(analytics)) return "incomplete_analytics";
    save(
      {
        site_name: siteName,
        tagline,
        default_locale: defaultLocale,
        published,
        home_path: homePath,
        analytics:
          analytics.provider === "none" ? EMPTY_SITE_ANALYTICS : analytics,
      },
      options,
    );
    return "submitted";
  };

  return {
    ready: Boolean(site),
    saving: updateSite.isPending,
    dirty,
    reset,
    commit,

    basics: {
      siteName,
      tagline,
      setSiteName,
      setTagline,
      locales,
      defaultLocale,
      primaryName: primaryText(siteName, defaultLocale),
    },

    locale: {
      defaultLocale,
      savedLocale,
      locales,
      /**
       * 确认后只钉本地草稿：原文留在原语言下，新主语言是空的、要另填。
       * 保存时和站名同一次请求。
       */
      setDefaultLocale: (next: AppLocale): void => {
        if (next === defaultLocale) return;
        const fromLocale = defaultLocale;
        setSiteName(pinToLocale(siteName, fromLocale));
        setTagline(pinToLocale(tagline, fromLocale));
        setDefaultLocale(next);
      },
    },

    visibility: {
      published,
      setPublished,
    },

    homepage: {
      path: homePath,
      setPath: setHomePath,
    },

    analytics: {
      value: analytics,
      setProvider: (next: SiteAnalyticsProvider): void => {
        if (next === analytics.provider) return;
        setAnalytics({
          provider: next,
          script_url: "",
          site_id: "",
        });
      },
      setScriptUrl: (next: string): void =>
        setAnalytics((current) => ({ ...current, script_url: next })),
      setSiteId: (next: string): void =>
        setAnalytics((current) => ({ ...current, site_id: next })),
    },
  };
}

export type SiteSettingsForm = ReturnType<typeof useSiteSettingsForm>;
