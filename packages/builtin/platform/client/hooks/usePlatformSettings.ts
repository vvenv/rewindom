import { api } from "@be-water/client-kit";
import { useQuery } from "@tanstack/react-query";


import type { PlatformSettings } from "../../shared/index.js";

export const PLATFORM_SETTINGS_KEY = ["platform-settings"] as const;

export function usePlatformSettings() {
  return useQuery({
    queryKey: PLATFORM_SETTINGS_KEY,
    queryFn: () => api.get<PlatformSettings>("/platform/settings"),
  });
}
