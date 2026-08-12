import { describe, expect, it } from "vitest";

import { getPageTemplateKind } from "../../marketing/shared/page-templates.js";
import {
  MEMBER_PAGE_TEMPLATE_GROUP,
  registerMemberPageTemplates,
} from "../../site-member/shared/member-page-templates.js";
import { MEMBER_BILLING_PAGE_KIND } from "./account-section.js";
import { registerSiteBillingPageTemplates } from "./member-billing-templates.js";

describe("会员付费模板页", () => {
  it("与登录等会员页共用「会员页版式」分组——不另开同名组", () => {
    registerMemberPageTemplates();
    registerSiteBillingPageTemplates();

    expect(getPageTemplateKind("member_login")?.group).toBe(
      MEMBER_PAGE_TEMPLATE_GROUP,
    );
    expect(getPageTemplateKind(MEMBER_BILLING_PAGE_KIND)?.group).toBe(
      MEMBER_PAGE_TEMPLATE_GROUP,
    );
  });
});
