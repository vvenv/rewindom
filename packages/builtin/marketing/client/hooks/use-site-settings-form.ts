import { useEffect, useState } from "react";

import { normalizeLocale, type AppLocale } from "@rewindom/shared";

import { siteLocaleOrder } from "../../shared/site-locale.js";
import {
  pinToLocale,
  primaryText,
  sameLocalizedText,
} from "../lib/site-settings-form.js";

import { useSiteMutations } from "./useSite.js";

import type {
  MarketingSite,
  SiteLocalizedText,
  UpdateMarketingSiteBody,
} from "../../shared/site-cms.js";

interface SaveOptions {
  onSuccess?: () => void;
  onError?: () => void;
}

/**
 * 站点设置的草稿。
 *
 * **控件即提交**：分区共用这一份 hook（切着改不丢），但落库由控件自己触发——
 * 站名 / 标语 blur 存、主语言确认后存、发布开关即存。审计里「改了站名」与
 * 「换了主语言」仍是两条不同的记录。
 *
 * 例外是**主语言**：换它必须连带把文案钉在原语言下（见 `pinToLocale`），所以
 * 那一次提交一定带着站名 / 标语。这不是耦合没拆干净，是那个操作本身就包含这一步
 * ——拆开存会在两次请求之间留下一个「文案语言已失真」的中间态。
 *
 * 站点数据回来（或被别处保存刷新）后按 `updated_at` 重新灌一次草稿。
 *
 * 控件即提交会改 `updated_at`，但「正在填哪种译文」是编辑会话状态，不是站点字段——
 * 重灌时不能把它打回主语言，否则切到 English 再改首页 / 发布，输入框会跳回中文。
 * 未失焦的站名 / 标语同理：别的分区先落库时，这边的草稿还在。
 */
export function useSiteSettingsForm(site: MarketingSite | undefined) {
  const { updateSite } = useSiteMutations();

  const savedLocale = normalizeLocale(site?.default_locale);

  const [siteName, setSiteName] = useState<SiteLocalizedText>("");
  const [tagline, setTagline] = useState<SiteLocalizedText>("");
  const [editLocale, setEditLocale] = useState<AppLocale>(savedLocale);
  const [defaultLocale, setDefaultLocale] = useState<AppLocale>(savedLocale);
  const [published, setPublished] = useState(false);
  const [homePath, setHomePath] = useState("/");
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!site || hydratedKey === site.updated_at) return;
    const locale = normalizeLocale(site.default_locale);
    const first = hydratedKey === null;
    const locales = siteLocaleOrder(locale);
    setDefaultLocale(locale);
    setPublished(site.published);
    setHomePath(site.home_path || "/");
    if (first) {
      setSiteName(site.site_name);
      setTagline(site.tagline);
      setEditLocale(locale);
    } else {
      setSiteName((current) =>
        sameLocalizedText(current, site.site_name, locales, locale)
          ? site.site_name
          : current,
      );
      setTagline((current) =>
        sameLocalizedText(current, site.tagline, locales, locale)
          ? site.tagline
          : current,
      );
    }
    setHydratedKey(site.updated_at);
  }, [site, hydratedKey]);

  const locales = siteLocaleOrder(defaultLocale);

  /*
   * 脏检查按**已保存的**主语言读两边：主语言本身改没改由 locale.commit 单独处理，
   * 混进来的话「换了主语言」会让基本信息也跟着变脏。
   */
  const savedLocales = siteLocaleOrder(savedLocale);
  const basicsDirty = Boolean(
    site &&
    (!sameLocalizedText(siteName, site.site_name, savedLocales, savedLocale) ||
      !sameLocalizedText(tagline, site.tagline, savedLocales, savedLocale)),
  );

  /** 放弃未提交改动：把草稿灌回线上那一版（开 Sheet 时清一次）。 */
  const reset = (): void => {
    if (!site) return;
    const locale = normalizeLocale(site.default_locale);
    setSiteName(site.site_name);
    setTagline(site.tagline);
    setEditLocale(locale);
    setDefaultLocale(locale);
    setPublished(site.published);
    setHomePath(site.home_path || "/");
    setHydratedKey(site.updated_at);
  };

  const save = (body: UpdateMarketingSiteBody, options?: SaveOptions): void => {
    updateSite.mutate(body, {
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    });
  };

  const restoreBasics = (): void => {
    if (!site) return;
    setSiteName(site.site_name);
    setTagline(site.tagline);
  };

  return {
    /** 站点还没拉到时表单整体不可用（草稿是空的，存下去会把站名清掉）。 */
    ready: Boolean(site),
    saving: updateSite.isPending,
    reset,

    basics: {
      siteName,
      tagline,
      editLocale,
      setEditLocale,
      setSiteName,
      setTagline,
      locales,
      defaultLocale,
      dirty: basicsDirty,
      /** 主语言那一份站名——空了整站没名字，提交前要拦。 */
      primaryName: primaryText(siteName, defaultLocale),
      restore: restoreBasics,
      /**
       * blur / 关 Sheet 时调用。返回是否发出了请求——调用方据此决定要不要 toast
       * 「必填」或切回主语言编辑。
       */
      commit: (options?: SaveOptions): boolean => {
        if (!site || !basicsDirty || updateSite.isPending) return false;
        if (!primaryText(siteName, defaultLocale)) return false;
        save({ site_name: siteName, tagline }, options);
        return true;
      },
    },

    locale: {
      defaultLocale,
      savedLocale,
      locales,
      /**
       * 确认后一次提交：先钉文案再换主语言，body 用算好的值而不是等 setState。
       * 失败则整段拨回线上那一版。
       */
      commit: (next: AppLocale, options?: SaveOptions): void => {
        if (!site || next === defaultLocale || updateSite.isPending) return;
        const fromLocale = defaultLocale;
        const pinnedName = pinToLocale(siteName, fromLocale);
        const pinnedTagline = pinToLocale(tagline, fromLocale);
        setSiteName(pinnedName);
        setTagline(pinnedTagline);
        setDefaultLocale(next);
        setEditLocale(next);
        save(
          {
            default_locale: next,
            site_name: pinnedName,
            tagline: pinnedTagline,
          },
          {
            onSuccess: options?.onSuccess,
            onError: () => {
              setSiteName(site.site_name);
              setTagline(site.tagline);
              setDefaultLocale(fromLocale);
              setEditLocale(fromLocale);
              options?.onError?.();
            },
          },
        );
      },
    },

    visibility: {
      published,
      /**
       * 开关即存：一个二值开关配一个保存按钮，只会让人以为点了开关就已经生效。
       * 先动开关再发请求（失败时由调用方 `restore()` 拨回去），省掉一次「点了没反应」。
       */
      toggle: (next: boolean, options?: SaveOptions): void => {
        setPublished(next);
        save({ published: next }, options);
      },
      restore: (): void => setPublished(site?.published ?? false),
    },

    homepage: {
      path: homePath,
      /**
       * 下拉即存：和发布开关同一口径。失败由调用方 `restore()` 拨回。
       */
      commit: (next: string, options?: SaveOptions): void => {
        if (!site || next === homePath || updateSite.isPending) return;
        setHomePath(next);
        save({ home_path: next }, {
          onSuccess: options?.onSuccess,
          onError: () => {
            setHomePath(site.home_path || "/");
            options?.onError?.();
          },
        });
      },
      restore: (): void => setHomePath(site?.home_path || "/"),
    },
  };
}

export type SiteSettingsForm = ReturnType<typeof useSiteSettingsForm>;
