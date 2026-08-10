import { usePublicConfig } from "@be-water/client-kit";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthLoginHero } from "./AuthLoginHero.js";

import type * as ClientKit from "@be-water/client-kit";

// `vi.mock` 会被提升到 import 之上，所以 import 照常放最前面
vi.mock("@be-water/client-kit", async () => {
  const actual = await vi.importActual<typeof ClientKit>(
    "@be-water/client-kit",
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

  it("renders product wordmark when no bound tenant logo", () => {
    const { container } = render(<AuthLoginHero variant="compact" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  // 租户 logo 现在由 `BrandMark` 用 mask 着色（一个 role="img" 的 span），不再是 <img>
  it("renders tenant logo mask when bound_tenant.logo_url is set", () => {
    vi.mocked(usePublicConfig).mockReturnValue({
      data: {
        registration_enabled: false,
        captcha_enabled: false,
        default_locale: "zh-CN",
        github_oauth_enabled: false,
        google_oauth_enabled: false,
        microsoft_oauth_enabled: false,
        single_tenant: false,
        bound_tenant: {
          slug: "acme",
          name: "Acme",
          logo_url: "/api/public/tenants/acme/branding/logo",
          favicon_url: null,
        },
        tenant_base_domain: null,
        platform_url: null,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    render(<AuthLoginHero variant="compact" />);
    const mark = screen.getByRole("img", { name: "Acme" });
    expect(mark.style.maskImage).toBe(
      'url("/api/public/tenants/acme/branding/logo")',
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });
});
