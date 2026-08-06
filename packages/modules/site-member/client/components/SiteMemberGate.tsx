import type { ReactNode } from "react";

import { Button } from "@be-water/ui/button";
import { Card, CardContent } from "@be-water/ui/card";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { MEMBER_REGISTER_PATH, memberLoginHref } from "../lib/member-routes.js";


/** `visibility=members` 页面的登录提示。挂在 marketing 的 `siteMemberGateSlot` 上。 */
export function SiteMemberGate({
  redirectTo,
}: {
  redirectTo: string;
}): ReactNode {
  const { t } = useTranslation("site-member");

  return (
    <Card className="mx-auto my-16 max-w-lg">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="rounded-full bg-muted p-3">
          <Lock className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t("gate.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("gate.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to={memberLoginHref(redirectTo)}>{t("gate.login")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={MEMBER_REGISTER_PATH}>{t("gate.register")}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
