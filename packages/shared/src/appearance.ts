import type { AppLocale } from "./locale.js";
import type { ShellLayoutSlug } from "./shell-layout.js";
import type { ThemePaletteSlug } from "./theme-palette.js";

/** 某一项外观默认值的来源：租户自己配的，还是继承的平台默认。 */
export type AppearanceSource = "tenant" | "platform";

/**
 * `GET /api/settings/appearance` 的响应：租户侧实际生效的外观默认值。
 *
 * 三根轴（主题、布局、语言）各自独立解析——租户可以只覆盖其中一根，其余继续继承平台。
 *
 * 放在 `@be-water/shared` 而非 platform 模块，是因为消费方是 client-kit
 * （底座设施，不能依赖业务模块），与 `TenantEntitlementsResponse` 同理。
 */
/** 租户品牌公开 URL（`GET /api/settings/branding`）。 */
export interface TenantBrandingUrls {
  logo_url: string | null;
  favicon_url: string | null;
}

export interface ResolvedTenantAppearance {
  theme: ThemePaletteSlug;
  theme_source: AppearanceSource;
  layout: ShellLayoutSlug;
  layout_source: AppearanceSource;
  locale: AppLocale;
  locale_source: AppearanceSource;
}
