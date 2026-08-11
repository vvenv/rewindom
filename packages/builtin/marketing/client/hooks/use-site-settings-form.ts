import { useEffect, useState } from "react";

import { normalizeLocale, type AppLocale } from "@be-water/shared";

import { siteLocaleOrder } from "../../shared/site-locale.js";
import {
  applySiteThemeSettings,
  type SiteTheme,
} from "../../shared/site-themes.js";
import {
  pinToLocale,
  primaryText,
  sameLocalizedText,
  sameThemeSettings,
  type SiteSettingsTab,
} from "../lib/site-settings-form.js";

import { useSiteMutations } from "./useSite.js";

import type {
  MarketingSite,
  SiteLocalizedText,
  UpdateMarketingSiteBody,
} from "../../shared/site-cms.js";
import type { ThemeSettings } from "../../shared/theme-sections.js";

interface SaveOptions {
  onSuccess?: () => void;
  onError?: () => void;
}

/**
 * 站点设置页的草稿。
 *
 * **一份草稿、多个保存按钮**：四个分区共用这一个 hook，切分区不丢改动（分区只是
 * 视图，不是四张互相独立的表单）；但每个分区只提交自己那几个字段，审计日志里
 * 「改了主色」与「换了主语言」因此是两条不同的记录，而不是一次糊在一起的整存。
 *
 * 例外是**主语言**：换它必须连带把文案钉在原语言下（见 `pinToLocale`），所以
 * 「语言」分区的提交一定带着站名 / 标语。这不是耦合没拆干净，是那个操作本身就
 * 包含这一步——拆开存会在两次请求之间留下一个「文案语言已失真」的中间态。
 *
 * 站点数据回来（或被别处保存刷新）后按 `updated_at` 重新灌一次草稿，与两个
 * 全屏编辑器同一口径。
 */
export function useSiteSettingsForm(site: MarketingSite | undefined) {
  const { updateSite } = useSiteMutations();

  const savedLocale = normalizeLocale(site?.default_locale);

  const [siteName, setSiteName] = useState<SiteLocalizedText>("");
  const [tagline, setTagline] = useState<SiteLocalizedText>("");
  const [editLocale, setEditLocale] = useState<AppLocale>(savedLocale);
  const [defaultLocale, setDefaultLocale] = useState<AppLocale>(savedLocale);
  const [theme, setTheme] = useState<ThemeSettings>({});
  const [published, setPublished] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!site || hydratedKey === site.updated_at) return;
    const locale = normalizeLocale(site.default_locale);
    setSiteName(site.site_name);
    setTagline(site.tagline);
    setEditLocale(locale);
    setDefaultLocale(locale);
    setTheme(site.theme_settings);
    setPublished(site.published);
    setHydratedKey(site.updated_at);
  }, [site, hydratedKey]);

  const locales = siteLocaleOrder(defaultLocale);
  const localeChanged = Boolean(site) && defaultLocale !== savedLocale;

  /*
   * 脏检查按**已保存的**主语言读两边：主语言本身改没改由 localeChanged 单独兜住，
   * 混进来的话「换了主语言」会让基本信息也跟着变脏。
   */
  const savedLocales = siteLocaleOrder(savedLocale);
  const basicsDirty = Boolean(
    site &&
    (!sameLocalizedText(siteName, site.site_name, savedLocales, savedLocale) ||
      !sameLocalizedText(tagline, site.tagline, savedLocales, savedLocale)),
  );
  const appearanceDirty = Boolean(
    site && !sameThemeSettings(theme, site.theme_settings),
  );

  /*
   * 只标设置页那几个分区；外观自己一整页，脏不脏由它自己的保存按钮表达，
   * 不需要页签上的点。
   */
  const dirtyTabs = new Set<SiteSettingsTab>();
  if (basicsDirty) dirtyTabs.add("basics");
  if (localeChanged) dirtyTabs.add("locale");

  const save = (body: UpdateMarketingSiteBody, options?: SaveOptions): void => {
    updateSite.mutate(body, {
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    });
  };

  return {
    /** 站点还没拉到时表单整体不可用（草稿是空的，存下去会把站名清掉）。 */
    ready: Boolean(site),
    saving: updateSite.isPending,
    dirtyTabs,

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
      save: (options?: SaveOptions) =>
        save({ site_name: siteName, tagline }, options),
    },

    appearance: {
      theme,
      setTheme,
      dirty: appearanceDirty,
      applyThemePack: (pack: SiteTheme) =>
        setTheme((current) => applySiteThemeSettings(current, pack)),
      save: (options?: SaveOptions) => save({ theme_settings: theme }, options),
    },

    locale: {
      defaultLocale,
      savedLocale,
      locales,
      changed: localeChanged,
      /** 先把现有文案钉在原主语言下，再换——顺序反了原文就被改了语言标签。 */
      change: (next: AppLocale): void => {
        if (next === defaultLocale) return;
        setSiteName((current) => pinToLocale(current, defaultLocale));
        setTagline((current) => pinToLocale(current, defaultLocale));
        setDefaultLocale(next);
        setEditLocale(next);
      },
      reset: (): void => {
        if (!site) return;
        setSiteName(site.site_name);
        setTagline(site.tagline);
        setDefaultLocale(savedLocale);
        setEditLocale(savedLocale);
      },
      save: (options?: SaveOptions) =>
        save(
          { default_locale: defaultLocale, site_name: siteName, tagline },
          options,
        ),
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
  };
}

export type SiteSettingsForm = ReturnType<typeof useSiteSettingsForm>;
