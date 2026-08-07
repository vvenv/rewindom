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
import { MemberOAuthButtons } from "../components/MemberOAuthButtons.js";
import { MemberPageShell } from "../components/MemberPageShell.js";
import { useSiteMemberAuth } from "../contexts/SiteMemberAuthContext.js";
import { useSiteMemberEnabled } from "../hooks/use-site-member-enabled.js";
import { resolveMemberRedirect } from "../lib/member-routes.js";
import { siteMemberApi, SITE_MEMBER_API_BASE } from "../lib/site-member-api.js";

import type { SiteMemberConfig } from "../../shared/site-member.js";

export function MemberLogin(): ReactNode {
  const { t } = useTranslation("site-member");
  const { login } = useSiteMemberAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const membersEnabled = useSiteMemberEnabled();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [githubOAuthEnabled, setGithubOAuthEnabled] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState(false);
  const [microsoftOAuthEnabled, setMicrosoftOAuthEnabled] = useState(false);
  const [captcha, setCaptcha] = useState<MemberCaptchaData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void siteMemberApi
      .get<SiteMemberConfig>(`${SITE_MEMBER_API_BASE}/config`, undefined, true)
      .then((config) => {
        setCaptchaEnabled(config.captcha_enabled);
        setGithubOAuthEnabled(config.github_oauth_enabled);
        setGoogleOAuthEnabled(config.google_oauth_enabled);
        setMicrosoftOAuthEnabled(config.microsoft_oauth_enabled);
      })
      .catch(() => {
        setCaptchaEnabled(false);
        setGithubOAuthEnabled(false);
        setGoogleOAuthEnabled(false);
        setMicrosoftOAuthEnabled(false);
      });
  }, []);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (captchaEnabled && !captcha) {
      toast.error(t("captcha.required"));
      return;
    }
    setSubmitting(true);
    try {
      await login({
        email: email.trim(),
        password,
        captcha: captchaEnabled ? captcha : null,
      });
      toast.success(t("login.success"));
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

  if (!membersEnabled) {
    return (
      <MemberPageShell title={t("login.title")} description={t("gate.description")}>
        <p className="text-center text-sm text-muted-foreground">
          {t("errors.generic")}
        </p>
      </MemberPageShell>
    );
  }

  return (
    <MemberPageShell title={t("login.title")} description={t("login.subtitle")}>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="member-email">
                  {t("fields.email")}
                </FieldLabel>
                <Input
                  id="member-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="member-password">
                  {t("fields.password")}
                </FieldLabel>
                <Input
                  id="member-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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
                {submitting ? t("login.submitting") : t("login.submit")}
              </Button>
            </FieldGroup>
          </form>
          <div className="mt-6">
            <MemberOAuthButtons
              githubEnabled={githubOAuthEnabled}
              googleEnabled={googleOAuthEnabled}
              microsoftEnabled={microsoftOAuthEnabled}
              disabled={submitting}
            />
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        {t("login.no_account")}{" "}
        <Link to="/member/register" className="text-primary hover:underline">
          {t("login.go_register")}
        </Link>
      </p>
    </MemberPageShell>
  );
}
