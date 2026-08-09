import "./lib/register-client-api-auth.js";

export { PageLayout } from "./components/PageLayout";
export { PermissionRoute } from "./components/PermissionRoute";
export { TenantModuleRoute } from "./components/TenantModuleRoute";
export { TenantEntitlementRoute } from "./components/TenantEntitlementRoute";
export { Logo } from "./components/Logo";
export { BrandMark } from "./components/BrandMark";
export { Wordmark } from "./components/Wordmark";
export { ThemeToggle } from "./components/ThemeToggle";
export { ThemePaletteToggle } from "./components/ThemePaletteToggle";
export { ShellLayoutToggle } from "./components/ShellLayoutToggle";
export { LocaleToggle } from "./components/LocaleToggle";
export {
  COLOR_MODES,
  useColorMode,
  type ColorMode,
  type ColorModeValue,
} from "./hooks/use-color-mode";
export {
  ThemePaletteProvider,
  useThemePalette,
  type ThemePaletteValue,
} from "./contexts/theme-palette-context";
export {
  ShellLayoutProvider,
  useShellLayout,
  type ShellLayoutValue,
} from "./contexts/shell-layout-context";
export {
  LocaleProvider,
  useLocale,
  type LocaleValue,
} from "./contexts/locale-context";
export {
  setupI18n,
  getI18n,
  changeAppLanguage,
  registerI18nBundles,
  i18n,
  SHELL_I18N_NAMESPACES,
} from "./i18n/setup";
export {
  readStoredAppLocale,
  APP_LOCALE_STORAGE_KEY,
  APP_LOCALE_DEFAULT_CACHE_KEY,
} from "./lib/read-stored-locale.js";
export {
  translateAppNavSections,
  translatePlatformNavEntries,
  resolveNavLabel,
} from "./i18n/translate-nav";
export {
  collectClientI18nBundles,
  type ClientI18nBundle,
} from "./lib/module-contract.js";
export {
  useTenantAppearance,
  TENANT_APPEARANCE_QUERY_KEY,
} from "./hooks/useTenantAppearance";
export {
  useResolvedPreference,
  type ResolvedPreference,
} from "./hooks/useResolvedPreference";
export {
  useOverflowRow,
  OVERFLOW_MEASURE_ROW_CLASS,
  type OverflowRow,
} from "./hooks/useOverflowRow";
export { AppVersion } from "./components/AppVersion";
export { ConfirmDialog } from "./components/ConfirmDialog";
export { CopyButton } from "./components/CopyButton";
export { DialogButton } from "./components/DialogButton";
export { FilterBar } from "./components/FilterBar";
export {
  DateTimeRangePicker,
  type DateTimeRangeExtraAction,
  type DateTimeRangePresetOption,
} from "./components/DateTimeRangePicker";
export { ErrorBoundary } from "./components/ErrorBoundary";
export { FieldInfoTip } from "./components/FieldInfoTip";
export {
  PageBackLink,
  PageSection,
  WorkbenchFormPanel,
  WORKBENCH_FORM_PANEL_CLASS,
  WorkbenchPageShell,
} from "./components/WorkbenchPageShell";
export {
  PageFilterBar,
  type FilterChipOption,
  type PageFilterBarProps,
} from "./components/PageFilterBar";
export { FilterResetButton } from "./components/FilterComponents";
export { DebouncedSearchInput } from "./components/DebouncedSearchInput";
export {
  KpiCard,
  KpiCardGrid,
  type KpiCardProps,
  type KpiVariant,
} from "./components/KpiCard";
export { DataTable, type DataTableColumnMeta, type DataTableFeatures } from "./components/DataTable";
export { EmptyState, type EmptyStateSize } from "./components/EmptyState";
export { DataTableColumnHeader } from "./components/DataTableColumnHeader";
export { Pagination } from "./components/Pagination";

export { useClipboard } from "./hooks/useClipboard";
export { useAuth } from "./hooks/useAuth";
export { useOptionalAuth } from "./hooks/useOptionalAuth";
export { useConfirm } from "./hooks/useConfirm";
export {
  usePermissions,
  PermissionsProvider,
  type PermissionsValue,
} from "./permission-context.js";
export { usePublicConfig } from "./hooks/usePublicConfig.js";
export {
  useTenantBranding,
  TENANT_BRANDING_QUERY_KEY,
} from "./hooks/useTenantBranding.js";
export { useDocumentFavicon } from "./hooks/useDocumentFavicon.js";
export {
  useTenantEntitlements,
  useTenantModuleEnabled,
  useTenantFeatureEnabled,
  useTenantEntitlementState,
  TENANT_ENTITLEMENTS_QUERY_KEY,
} from "./hooks/useTenantEntitlements";
export {
  useDebouncedInput,
  DEFAULT_DEBOUNCE_MS,
} from "./hooks/useDebouncedInput";
export { useDebouncedValue } from "./hooks/useDebouncedValue";
export { useMediaQuery } from "./hooks/useMediaQuery";
export {
  useAppHomePath,
  resolveAppHomePath,
  DEFAULT_HOME_PATH,
  EXAMPLE_HOME_PATH_CANDIDATES,
} from "./hooks/useAppHomePath";
export type { HomePathCandidate } from "./hooks/useAppHomePath";
export {
  useDefaultHomePath,
  APP_HOME_ENTRY_PATH,
  PLATFORM_HOME_PATH,
} from "./hooks/useDefaultHomePath";
export {
  buildPlatformConsoleUrl,
  goToPlatformConsole,
  isPlatformConsoleOrigin,
} from "./lib/platform-console-url.js";
export { ExternalOrNavigate } from "./components/ExternalOrNavigate.js";
export { useAppVersion } from "./hooks/useAppVersion";
export { usePersistState } from "./hooks/usePersistState";
export {
  readPersistedValue,
  writePersistedValue,
  removePersistedValue,
  type UsePersistStateOptions,
} from "./lib/persist-storage.js";
export {
  clearStoredAuthTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredAuthTokens,
  hasStoredAuthTokens,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "./lib/auth-token-storage.js";
export {
  readTenantIdFromAccessToken,
  readStoredTenantQueryScope,
  readActorTypeFromAccessToken,
  isTenantAccessToken,
  useTenantQueryScope,
} from "./tenant-query-scope.js";
export {
  TenantFilterProvider,
  useTenantFilter,
  type TenantFilterProps,
  type TenantFilterComponent,
} from "./tenant-filter-slot.js";
export { createComponentSlot, type ComponentSlot } from "./component-slot.js";

export * from "./lib/list-url-params";
export * from "./lib/url-params";
export * from "./lib/with-query";
export * from "./lib/app-nav-types";
export * from "./lib/module-contract";
export * from "./lib/datetime-local";
export * from "./lib/calendar-range";
export {
  translateThemePaletteLabel,
  translateThemePaletteOptions,
} from "./lib/translate-theme-palette";
export {
  translateShellLayoutLabel,
  translateShellLayoutOptions,
} from "./lib/translate-shell-layout";
export * from "./lib/platform-nav-types";
export {
  PlatformNavProvider,
  usePlatformNavEntries,
} from "./contexts/platform-nav-context";
export { MarkdownContent } from "./components/MarkdownContent";
export {
  isTextAttachmentFile,
  snapshotInputFiles,
} from "./lib/text-attachment-upload";
export { optionsFromLabels } from "./lib/filter-chip-options";
export * from "./lib/app-nav-quick-links";
export {
  registerDashboardWidgetsProvider,
  getDashboardWidgets,
} from "./lib/dashboard-widgets";
export {
  configureClientTenantCatalog,
  getClientTenantCatalog,
} from "./lib/tenant-catalog";
export * from "./lib/environment";
export { AuthProvider, AuthContext } from "./contexts/AuthContext";
export { ConfirmProvider, ConfirmContext } from "./contexts/ConfirmContext";
export {
  NavBadgeRegistryProvider,
  useNavBadgeCount,
  useNavBadgeRegistry,
} from "./contexts/nav-badge-context";
export type { AuthContextType } from "./contexts/AuthContext";
export type { ConfirmContextValue } from "./contexts/ConfirmContext";

// 原 @be-water/client-api
export {
  api,
  apiRequest,
  createApiClient,
  ApiError,
  shouldClearAuthOnError,
  pauseTokenRefresh,
  isTransientApiError,
  setApiAcceptLanguage,
  getApiAcceptLanguage,
} from "./api.js";
export type { ApiClient, ApiClientOptions } from "./api.js";
export { configureAuthTokenStore, type AuthTokenStore } from "./auth-store.js";
