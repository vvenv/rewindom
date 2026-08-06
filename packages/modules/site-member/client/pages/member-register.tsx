import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { ApiError } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { Card, CardContent } from "@be-water/ui/card";
import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import { Spinner } from "@be-water/ui/spinner";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";

import { MemberCaptcha, type MemberCaptchaData } from "../components/MemberCaptcha.js";
import { MemberPageShell } from "../components/MemberPageShell.js";
import { useSiteMemberAuth } from "../contexts/SiteMemberAuthContext.js";
import { resolveMemberRedirect } from "../lib/member-routes.js";
import { siteMemberApi, SITE_MEMBER_API_BASE } from "../lib/site-member-api.js";

import type { SiteMemberConfig } from "../../shared/site-member.js";

export function MemberRegister(): ReactNode {
  const { t } = useTranslation("site-member");
  const { register } = useSiteMemberAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [captcha, setCaptcha] = useState<MemberCaptchaData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void siteMemberApi
      .get<SiteMemberConfig>(`${SITE_MEMBER_API_BASE}/config`, undefined, true)
      .then((config) => setCaptchaEnabled(config.captcha_enabled))
      .catch(() => setCaptchaEnabled(false));
  }, []);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (captchaEnabled && !captcha) {
      toast.error(t("captcha.required"));
      return;
    }
    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        display_name: displayName.trim() || undefined,
        captcha: captchaEnabled ? captcha : null,
      });
      toast.success(t("register.success"));
      void navigate(resolveMemberRedirect(searchParams.get("redirect")), {
        replace: true,
      });
    } catch (error) {
      setCaptcha(null);
      toast.error(
        error instanceof ApiError ? error.message : t("errors.generic"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MemberPageShell
      title={t("register.title")}
      description={t("register.subtitle")}
    >
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="member-register-email">
                  {t("fields.email")}
                </FieldLabel>
                <Input
                  id="member-register-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="member-register-password">
                  {t("fields.password")}
                </FieldLabel>
                <Input
                  id="member-register-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="member-register-name">
                  {t("fields.display_name")}
                </FieldLabel>
                <Input
                  id="member-register-name"
                  autoComplete="nickname"
                  placeholder={t("fields.display_name_placeholder")}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </Field>
              {captchaEnabled ? (
                <MemberCaptcha
                  onSuccess={setCaptcha}
                  onError={() => setCaptcha(null)}
                />
              ) : null}
              <Button
                type="submit"
                disabled={submitting || (captchaEnabled && !captcha)}
              >
                {submitting ? <Spinner /> : null}
                {submitting ? t("register.submitting") : t("register.submit")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        {t("register.has_account")}{" "}
        <Link to="/member/login" className="text-primary hover:underline">
          {t("register.go_login")}
        </Link>
      </p>
    </MemberPageShell>
  );
}
