import "./lib/register-client-api-auth.js";

export { PageLayout } from "./components/PageLayout";
export { PermissionRoute } from "./components/PermissionRoute";
export { TenantModuleRoute } from "./components/TenantModuleRoute";
export { TenantEntitlementRoute } from "./components/TenantEntitlementRoute";
export { Logo } from "./components/Logo";
export { Wordmark } from "./components/Wordmark";
export { ThemeToggle } from "./components/ThemeToggle";
export { ThemePaletteToggle } from "./components/ThemePaletteToggle";
export { ShellLayoutToggle } from "./components/ShellLayoutToggle";
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
export { DataTable, type DataTableColumnMeta } from "./components/DataTable";
export { DataTableColumnHeader } from "./components/DataTableColumnHeader";
export { Pagination } from "./components/Pagination";

export { useClipboard } from "./hooks/useClipboard";
export { useAuth } from "./hooks/useAuth";
export { useConfirm } from "./hooks/useConfirm";
export {
  usePermissions,
  PermissionsProvider,
  type PermissionsValue,
} from "./permission-context.js";
export { usePublicConfig } from "./hooks/usePublicConfig.js";
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
} from "./hooks/useAppHomePath";
export type { HomePathCandidate } from "./hooks/useAppHomePath";
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
  ApiError,
  shouldClearAuthOnError,
  pauseTokenRefresh,
  isTransientApiError,
} from "./api.js";
export {
  configureAuthTokenStore,
  type AuthTokenStore,
} from "./auth-store.js";
