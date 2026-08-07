import type { ReactElement } from "react";

import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MarkdownProse } from "../../../marketing/client/components/MarkdownProse.js";
import { settingText } from "../../../marketing/shared/section-schema.js";
import { useOptionalSiteMemberAuth } from "../contexts/SiteMemberAuthContext.js";

import type { SectionViewProps } from "../../../marketing/client/components/sections/section-parts.js";

/**
 * 「会员专属内容」段的客户端视图。
 *
 * 结构与 SSR 的 `renderMemberGateHtml` 在**锁定态**下同构；已登录才多出正文——
 * SSR 永远画锁定态（服务端读不到会员 token），这是刻意的，不是遗漏。
 */
export function MemberGateSection({
  section,
}: SectionViewProps): ReactElement | null {
  const { t } = useTranslation("site-member");
  // 用 optional 版：段可能渲染在没有会员 Provider 的环境里（编辑器预览）
  const auth = useOptionalSiteMemberAuth();
  const s = section.settings;

  if (auth?.isAuthenticated) {
    return <MarkdownProse markdown={settingText(s, "body_md")} />;
  }

  const body = settingText(s, "locked_body");
  return (
    <div className="member-gate" data-member-gate={section.id}>
      <span className="member-gate-icon" aria-hidden>
        <Lock className="size-5" />
      </span>
      <p className="title">
        {settingText(s, "locked_headline") || t("section.gate.label")}
      </p>
      {body ? <p className="muted">{body}</p> : null}
      <p>
        <a className="btn" href="/member/login">
          {settingText(s, "login_label")}
        </a>
      </p>
    </div>
  );
}
