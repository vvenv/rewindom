import {
  type ReactNode,
  useEffect,
  useRef,
} from "react";

import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";

import { listMemberMenuLinks } from "../../shared/member-menu-links.js";
import { useOptionalSiteMemberAuth } from "../contexts/SiteMemberAuthContext.js";
import { useSiteMemberEnabled } from "../hooks/use-site-member-enabled.js";
import { memberDisplayName, memberInitials } from "../lib/member-display.js";
import {
  isMemberAreaPath,
  MEMBER_ACCOUNT_PATH,
  memberLoginHref,
} from "../lib/member-routes.js";

import type { SiteMemberProfile } from "../../shared/site-member.js";

function MemberAvatar({ member }: { member: SiteMemberProfile | null }): ReactNode {
  const initials = memberInitials(member);
  return (
    <span className="member-avatar" aria-hidden>
      {initials || (
        <svg
          className="icon-sm"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )}
    </span>
  );
}

/**
 * 站点页头的会员入口（React 参考实现；公开站由 SSR + site-enhance 对等渲染）。
 *
 * 样式走官网语义 CSS（`btn` / `member-menu`），不依赖工作台 shadcn Button。
 */
export function SiteMemberEntry({
  className,
}: {
  className?: string;
}): ReactNode {
  const { t, i18n } = useTranslation("site-member");
  const auth = useOptionalSiteMemberAuth();
  const enabled = useSiteMemberEnabled();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const contributedLinks = listMemberMenuLinks();

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;
    const onPointerDown = (event: PointerEvent): void => {
      if (!details.open) return;
      if (event.target instanceof Node && details.contains(event.target)) {
        return;
      }
      details.open = false;
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  if (!enabled) return null;

  if (!auth?.isAuthenticated) {
    return (
      <Link
        to={memberLoginHref(`${pathname}${search}`)}
        className={["btn", "btn-ghost", "member-entry", className]
          .filter(Boolean)
          .join(" ")}
      >
        <svg
          className="icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {t("entry.login")}
      </Link>
    );
  }

  const member = auth.member;
  const displayName = memberDisplayName(member);

  async function handleLogout(): Promise<void> {
    await auth?.logout();
    toast.success(t("account.logged_out"));
    if (isMemberAreaPath(pathname)) {
      void navigate("/", { replace: true });
    }
  }

  return (
    <details
      ref={detailsRef}
      className={["member-menu", className].filter(Boolean).join(" ")}
    >
      <summary aria-label={t("entry.menu")}>
        <MemberAvatar member={member} />
        <span className="member-name">{displayName}</span>
      </summary>
      <div className="member-menu-panel">
        <div className="member-menu-label">
          <MemberAvatar member={member} />
          <div>
            <strong>{displayName}</strong>
            {member?.email && member.email !== displayName ? (
              <span className="muted">{member.email}</span>
            ) : null}
          </div>
        </div>
        <Link to={MEMBER_ACCOUNT_PATH} onClick={() => {
          if (detailsRef.current) detailsRef.current.open = false;
        }}>
          {t("entry.account")}
        </Link>
        {contributedLinks.map((link) => (
          <Link
            key={link.id}
            to={link.href}
            onClick={() => {
              if (detailsRef.current) detailsRef.current.open = false;
            }}
          >
            {link.label_key
              ? i18n.t(link.label_key)
              : (link.labels[
                  i18n.language as keyof typeof link.labels
                ] ?? link.labels["zh-CN"])}
          </Link>
        ))}
        <button type="button" onClick={() => void handleLogout()}>
          {t("account.logout")}
        </button>
      </div>
    </details>
  );
}
