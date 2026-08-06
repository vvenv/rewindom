import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { ApiError } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@be-water/ui/card";
import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import { Spinner } from "@be-water/ui/spinner";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router";

import { MemberPageShell } from "../components/MemberPageShell.js";
import { useSiteMemberAuth } from "../contexts/SiteMemberAuthContext.js";
import { MEMBER_LOGIN_PATH } from "../lib/member-routes.js";

function formatDate(value: string | null, fallback: string): string {
  if (!value) return fallback;
  return new Date(value).toLocaleString();
}

function ProfileCard(): ReactNode {
  const { t } = useTranslation("site-member");
  const { member, updateProfile } = useSiteMemberAuth();
  const [displayName, setDisplayName] = useState(member?.display_name ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(member?.display_name ?? "");
  }, [member?.display_name]);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ display_name: displayName.trim() });
      toast.success(t("account.saved"));
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("errors.generic"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("account.profile_title")}</CardTitle>
        <CardDescription>{t("account.profile_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="member-account-email">
                {t("fields.email")}
              </FieldLabel>
              <Input
                id="member-account-email"
                value={member?.email ?? ""}
                readOnly
                disabled
              />
              <p className="text-xs text-muted-foreground">
                {t("account.email_readonly")}
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="member-account-name">
                {t("fields.display_name")}
              </FieldLabel>
              <Input
                id="member-account-name"
                value={displayName}
                placeholder={t("fields.display_name_placeholder")}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </Field>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">
                {t("account.created_at")}
              </dt>
              <dd>
                {formatDate(member?.created_at ?? null, t("account.never"))}
              </dd>
              <dt className="text-muted-foreground">
                {t("account.last_login_at")}
              </dt>
              <dd>
                {formatDate(member?.last_login_at ?? null, t("account.never"))}
              </dd>
            </dl>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner /> : null}
              {saving ? t("account.saving") : t("account.save")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordCard(): ReactNode {
  const { t } = useTranslation("site-member");
  const { changePassword } = useSiteMemberAuth();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("account.password_mismatch"));
      return;
    }
    setSaving(true);
    try {
      await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      toast.success(t("account.password_changed"));
      void navigate(MEMBER_LOGIN_PATH, { replace: true });
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("errors.generic"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("account.password_title")}</CardTitle>
        <CardDescription>{t("account.password_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="member-old-password">
                {t("fields.old_password")}
              </FieldLabel>
              <Input
                id="member-old-password"
                type="password"
                autoComplete="current-password"
                required
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="member-new-password">
                {t("fields.new_password")}
              </FieldLabel>
              <Input
                id="member-new-password"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="member-confirm-password">
                {t("fields.confirm_password")}
              </FieldLabel>
              <Input
                id="member-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner /> : null}
              {saving ? t("account.saving") : t("account.save")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

export function MemberAccount(): ReactNode {
  const { t } = useTranslation("site-member");
  const { isAuthenticated, isLoading, logout } = useSiteMemberAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <MemberPageShell title={t("account.title")}>
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      </MemberPageShell>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={MEMBER_LOGIN_PATH} replace />;
  }

  async function handleLogout(): Promise<void> {
    await logout();
    toast.success(t("account.logged_out"));
    void navigate(MEMBER_LOGIN_PATH, { replace: true });
  }

  return (
    <MemberPageShell title={t("account.title")} className="max-w-lg">
      <ProfileCard />
      <PasswordCard />
      <Button variant="outline" className="w-full" onClick={handleLogout}>
        {t("account.logout")}
      </Button>
    </MemberPageShell>
  );
}
