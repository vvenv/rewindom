import { api } from "@be-water/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PLATFORM_SETTINGS_KEY } from "./usePlatformSettings.js";

import type { PlatformSettings } from "../../shared/index.js";

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newSettings: Partial<PlatformSettings>) =>
      api.put<PlatformSettings>("/platform/settings", newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLATFORM_SETTINGS_KEY });
    },
  });
}
