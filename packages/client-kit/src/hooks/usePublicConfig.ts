/**
 * 公开配置（自助注册是否开放、验证码是否启用）。
 *
 * 打的是内核路由 `/api/public/config`，消费方是壳层的登录/注册页——
 * 与平台控制台无关，故不属于 `platform` 模块。
 */
import { useQuery } from "@tanstack/react-query";

import { api } from "../api.js";

import type { PublicConfig } from "@be-water/shared";

const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
  registration_enabled: false,
  captcha_enabled: false,
  default_locale: "zh-CN",
};

export function usePublicConfig() {
  const query = useQuery({
    queryKey: ["public-config"],
    queryFn: () => api.get<PublicConfig>("/public/config", undefined, true),
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    data: {
      ...DEFAULT_PUBLIC_CONFIG,
      ...query.data,
    },
  };
}
