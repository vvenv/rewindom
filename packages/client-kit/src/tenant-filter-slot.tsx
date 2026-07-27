import {
  createContext,
  useContext,
  type ComponentType,
  type ReactNode,
} from "react";

/**
 * Props for a tenant filter/picker component. Mirrors platform's TenantCombobox
 * so it can be registered as-is. Kept here (client infra) so platform-admin
 * observability viewers (audit/error-log/slow-query) do not import module-platform.
 */
export interface TenantFilterProps {
  value?: string | null;
  onValueChange: (slug: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  showTrigger?: boolean;
  showClear?: boolean;
  includeArchived?: boolean;
  className?: string;
}

export type TenantFilterComponent = ComponentType<TenantFilterProps>;

const TenantFilterContext = createContext<TenantFilterComponent | null>(null);

/**
 * App-shell registers the concrete tenant filter (platform's TenantCombobox).
 * Viewers consume it via {@link useTenantFilter} instead of importing platform.
 */
export function TenantFilterProvider({
  component,
  children,
}: {
  component: TenantFilterComponent;
  children: ReactNode;
}) {
  return (
    <TenantFilterContext.Provider value={component}>
      {children}
    </TenantFilterContext.Provider>
  );
}

/** Returns the app-registered tenant filter component, or null if none registered. */
export function useTenantFilter(): TenantFilterComponent | null {
  return useContext(TenantFilterContext);
}
