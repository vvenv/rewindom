import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@be-water/client-kit", async () => {
  const actual = await vi.importActual<typeof import("@be-water/client-kit")>(
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

import { usePublicConfig } from "@be-water/client-kit";

import { AuthLoginHero } from "./AuthLoginHero.js";

describe("AuthLoginHero", () => {
  beforeEach(() => {
    vi.mocked(usePublicConfig).mockReturnValue({
      data: {
        registration_enabled: false,
        captcha_enabled: false,
        default_locale: "zh-CN",
        github_oauth_enabled: false,
        google_oauth_enabled: false,
        single_tenant: false,
        bound_tenant: null,
        tenant_base_domain: null,
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

  it("renders tenant logo img when bound_tenant.logo_url is set", () => {
    vi.mocked(usePublicConfig).mockReturnValue({
      data: {
        registration_enabled: false,
        captcha_enabled: false,
        default_locale: "zh-CN",
        github_oauth_enabled: false,
        google_oauth_enabled: false,
        single_tenant: false,
        bound_tenant: {
          slug: "acme",
          name: "Acme",
          logo_url: "/api/public/tenants/acme/branding/logo",
          favicon_url: null,
        },
        tenant_base_domain: null,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    render(<AuthLoginHero variant="compact" />);
    expect(screen.getByAltText("Acme")).toHaveAttribute(
      "src",
      "/api/public/tenants/acme/branding/logo",
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });
});
