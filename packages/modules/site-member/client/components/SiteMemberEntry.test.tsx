import { registerI18nBundles, setupI18n } from "@be-water/client-kit";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SITE_MEMBER_I18N } from "../i18n.js";

import { SiteMemberEntry } from "./SiteMemberEntry.js";

import type { SiteMemberProfile } from "../../shared/site-member.js";
import type { SiteMemberAuthContextValue } from "../contexts/SiteMemberAuthContext.js";

const logout = vi.fn(async () => {});
let auth: SiteMemberAuthContextValue | null = null;
let enabled = true;

vi.mock("../contexts/SiteMemberAuthContext.js", () => ({
  useOptionalSiteMemberAuth: () => auth,
}));

// 开关要发一次请求，组件测里固定成「已开通」
vi.mock("../hooks/use-site-member-enabled.js", () => ({
  useSiteMemberEnabled: () => enabled,
}));

const navigate = vi.fn();
vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => navigate };
});

registerI18nBundles([SITE_MEMBER_I18N]);
setupI18n("zh-CN");

function member(partial: Partial<SiteMemberProfile> = {}): SiteMemberProfile {
  return {
    id: "m1",
    email: "ada@example.com",
    display_name: "Ada Lovelace",
    email_verified: true,
    created_at: "2026-01-01T00:00:00.000Z",
    last_login_at: null,
    ...partial,
  };
}

function signedIn(
  profile: SiteMemberProfile | null = member(),
): SiteMemberAuthContextValue {
  return {
    member: profile,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout,
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  };
}

function renderEntry(path = "/pricing") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SiteMemberEntry />
    </MemoryRouter>,
  );
}

/** Radix 的菜单认 pointerdown，不是 click。 */
async function openMenu(): Promise<void> {
  fireEvent.pointerDown(
    screen.getByRole("button", { name: "账户菜单" }),
    { button: 0, ctrlKey: false, pointerType: "mouse" },
  );
  await screen.findByRole("menu");
}

beforeEach(() => {
  vi.clearAllMocks();
  auth = null;
  enabled = true;
});

describe("SiteMemberEntry", () => {
  // 站点没开通会员时，页头不该多出一个点不动的入口
  it("renders nothing when the site has no members", () => {
    enabled = false;
    auth = signedIn();
    const { container } = renderEntry();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a login link carrying the current path as redirect", () => {
    renderEntry("/docs/guide");
    expect(screen.getByRole("link", { name: /登录/u })).toHaveAttribute(
      "href",
      `/member/login?redirect=${encodeURIComponent("/docs/guide")}`,
    );
  });

  it("puts the member's name on the trigger once signed in", () => {
    auth = signedIn();
    renderEntry();
    expect(
      screen.getByRole("button", { name: "账户菜单" }),
    ).toHaveTextContent("Ada Lovelace");
    expect(screen.queryByRole("link", { name: /登录/u })).not.toBeInTheDocument();
  });

  it("shows name, email and both actions in the dropdown", async () => {
    auth = signedIn();
    renderEntry();
    await openMenu();

    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /我的账户/u })).toHaveAttribute(
      "href",
      "/member/account",
    );
    expect(
      screen.getByRole("menuitem", { name: /退出登录/u }),
    ).toBeInTheDocument();
  });

  // 昵称是选填的：没填时用邮箱当名字，下拉里就不该在名字下面再重复一行邮箱
  it("falls back to the email without repeating it", async () => {
    auth = signedIn(member({ display_name: "" }));
    renderEntry();

    // 菜单一展开，触发器就被移出无障碍树了，所以先验它
    expect(
      screen.getByRole("button", { name: "账户菜单" }),
    ).toHaveTextContent("ada@example.com");

    await openMenu();
    expect(
      within(screen.getByRole("menu")).getAllByText("ada@example.com"),
    ).toHaveLength(1);
  });

  it("logs out and stays put on an ordinary page", async () => {
    auth = signedIn();
    renderEntry("/pricing");
    await openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: /退出登录/u }));

    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(navigate).not.toHaveBeenCalled();
  });

  // 会员专区退出后就打不开了，留在原地只会看到一个空壳
  it("sends you home when logging out from the member area", async () => {
    auth = signedIn();
    renderEntry("/member/account");
    await openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: /退出登录/u }));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/", { replace: true }),
    );
  });
});
