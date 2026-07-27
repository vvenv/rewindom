import {
  createContext,
  useContext,
  type ComponentType,
  type ReactNode,
} from "react";

/**
 * Generic component-injection slot. The owning module registers a concrete
 * component (via a shell provider contribution); consumers render it via the
 * hook, staying decoupled from the owner. Same inversion as the tenant-filter
 * slot, generalized so platform-console views can embed widgets owned by other
 * modules without importing them.
 */
export interface ComponentSlot<P> {
  Provider: ComponentType<{ component: ComponentType<P>; children: ReactNode }>;
  useSlot: () => ComponentType<P> | null;
}

export function createComponentSlot<P = Record<string, never>>(
  displayName: string,
): ComponentSlot<P> {
  const Context = createContext<ComponentType<P> | null>(null);
  Context.displayName = displayName;

  function Provider({
    component,
    children,
  }: {
    component: ComponentType<P>;
    children: ReactNode;
  }) {
    return <Context.Provider value={component}>{children}</Context.Provider>;
  }

  function useSlot(): ComponentType<P> | null {
    return useContext(Context);
  }

  return { Provider, useSlot };
}
