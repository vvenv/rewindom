import { usePublicConfig } from "@rewindom/client-kit";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthLoginHero } from "./AuthLoginHero.js";

import type * as ClientKit from "@rewindom/client-kit";

// `vi.mock` 会被提升到 import 之上，所以 import 照常放最前面
vi.mock("@rewindom/client-kit", async () => {
  const actual = await vi.importActual<typeof ClientKit>(
    "@rewindom/client-kit",
  );
  return {
    ...actual,
    usePublicConfig: vi.fn(),
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("AuthLoginHero", () => {
  beforeEach(() => {
    vi.mocked(usePublicConfig).mockReturnValue({
      data: {
        registration_enabled: false,
        captcha_enabled: false,
        default_locale: "zh-CN",
        github_oauth_enabled: false,
        google_oauth_enabled: false,
        microsoft_oauth_enabled: false,
        single_tenant: false,
        bound_tenant: null,
        tenant_base_domain: null,
        platform_url: null,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  });

  it("renders the product wordmark", () => {
    const { container } = render(<AuthLoginHero variant="compact" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  /*
   * 中台登录页**不挂租户品牌**，绑定域名下也一样：品牌是站点的资产
   * （`theme_settings`），只作用于官网。曾经这里会渲染租户 logo。
   */
  it("still renders the product wordmark on a bound domain", () => {
    vi.mocked(usePublicConfig).mockReturnValue({
      data: {
        registration_enabled: false,
        captcha_enabled: false,
        default_locale: "zh-CN",
        github_oauth_enabled: false,
        google_oauth_enabled: false,
        microsoft_oauth_enabled: false,
        single_tenant: false,
        bound_tenant: { slug: "acme", name: "Acme" },
        tenant_base_domain: null,
        platform_url: null,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    const { container } = render(<AuthLoginHero variant="compact" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.queryByText("Acme")).not.toBeInTheDocument();
  });
});
