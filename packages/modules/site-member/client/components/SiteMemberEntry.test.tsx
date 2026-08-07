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
    completeOAuthExchange: vi.fn(),
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

function openMenu(): HTMLDetailsElement {
  const summary = screen.getByLabelText("账户菜单");
  const root = summary.closest("details");
  expect(root).not.toBeNull();
  fireEvent.click(summary);
  root!.open = true;
  return root!;
}

beforeEach(() => {
  vi.clearAllMocks();
  auth = null;
  enabled = true;
});

describe("SiteMemberEntry", () => {
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
    expect(screen.getByLabelText("账户菜单")).toHaveTextContent("Ada Lovelace");
    expect(screen.queryByRole("link", { name: /登录/u })).not.toBeInTheDocument();
  });

  it("shows name, email and both actions in the dropdown", () => {
    auth = signedIn();
    renderEntry();
    const menu = openMenu();

    expect(within(menu).getByText("ada@example.com")).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: /我的账户/u })).toHaveAttribute(
      "href",
      "/member/account",
    );
    expect(
      within(menu).getByRole("button", { name: /退出登录/u }),
    ).toBeInTheDocument();
  });

  it("falls back to the email without repeating it", () => {
    auth = signedIn(member({ display_name: "" }));
    renderEntry();

    const summary = screen.getByLabelText("账户菜单");
    expect(summary).toHaveTextContent("ada@example.com");

    fireEvent.click(summary);
    const menu = summary.closest("details")!;
    menu.open = true;
    const panel = menu.querySelector(".member-menu-panel");
    expect(panel).not.toBeNull();
    // 昵称回落成邮箱时，面板标题只有一行，不再重复副标题
    expect(within(panel as HTMLElement).getAllByText("ada@example.com")).toHaveLength(
      1,
    );
  });

  it("logs out and stays put on an ordinary page", async () => {
    auth = signedIn();
    renderEntry("/pricing");
    const menu = openMenu();

    fireEvent.click(within(menu).getByRole("button", { name: /退出登录/u }));

    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(navigate).not.toHaveBeenCalled();
  });

  it("sends you home when logging out from the member area", async () => {
    auth = signedIn();
    renderEntry("/member/account");
    const menu = openMenu();

    fireEvent.click(within(menu).getByRole("button", { name: /退出登录/u }));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/", { replace: true }),
    );
  });
});
