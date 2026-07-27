import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface NavBadgeRegistryValue {
  badges: Record<string, number>;
  setBadge: (key: string, count: number) => void;
}

const NavBadgeRegistryContext = createContext<NavBadgeRegistryValue | null>(
  null,
);

export function NavBadgeRegistryProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [badges, setBadges] = useState<Record<string, number>>({});

  const setBadge = useCallback((key: string, count: number) => {
    setBadges((current) => {
      if ((current[key] ?? 0) === count) {
        return current;
      }
      return { ...current, [key]: count };
    });
  }, []);

  const value = useMemo(
    () => ({
      badges,
      setBadge,
    }),
    [badges, setBadge],
  );

  return (
    <NavBadgeRegistryContext.Provider value={value}>
      {children}
    </NavBadgeRegistryContext.Provider>
  );
}

export function useNavBadgeRegistry(): NavBadgeRegistryValue {
  const context = useContext(NavBadgeRegistryContext);
  if (!context) {
    throw new Error("useNavBadgeRegistry must be used within NavBadgeRegistryProvider");
  }
  return context;
}

export function useNavBadgeCount(badgeKey: string | undefined): number {
  const { badges } = useNavBadgeRegistry();
  if (!badgeKey) {
    return 0;
  }
  return badges[badgeKey] ?? 0;
}
