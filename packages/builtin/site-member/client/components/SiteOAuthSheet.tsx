import { useState, type ReactNode } from "react";

import { ApiError } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { Spinner } from "@be-water/ui/spinner";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";

import {
  useClearSiteOAuthProvider,
  useUpsertSiteOAuthProvider,
} from "../hooks/useSiteOAuth.js";

import type {
  SiteOAuthProviderId,
  SiteOAuthProviderStatus,
} from "../../shared/site-oauth.js";

const PROVIDER_ORDER: SiteOAuthProviderId[] = ["github", "google", "microsoft"];

interface ProviderDraft {
  client_id: string;
  client_secret: string;
  callback_url: string;
  authority: string;
}

type ProviderDrafts = Record<SiteOAuthProviderId, ProviderDraft>;

function emptyStatus(provider: SiteOAuthProviderId): SiteOAuthProviderStatus {
  return {
    provider,
    enabled: false,
    source: "platform",
    tenant_configured: false,
    client_id: null,
    callback_url: null,
    authority: null,
  };
}

function toDraft(status: SiteOAuthProviderStatus): ProviderDraft {
  return {
    client_id: status.client_id ?? "",
    // secret 永不回显；留空即「维持现有 secret」
    client_secret: "",
    callback_url: status.callback_url ?? "",
    authority: status.authority ?? "common",
  };
}

function buildDrafts(
  statuses: Record<SiteOAuthProviderId, SiteOAuthProviderStatus>,
): ProviderDrafts {
  return {
    github: toDraft(statuses.github),
    google: toDraft(statuses.google),
    microsoft: toDraft(statuses.microsoft),
  };
}

function isDirty(draft: ProviderDraft, baseline: ProviderDraft): boolean {
  return (
    draft.client_id.trim() !== baseline.client_id.trim() ||
    draft.client_secret.trim() !== "" ||
    draft.callback_url.trim() !== baseline.callback_url.trim() ||
    draft.authority.trim() !== baseline.authority.trim()
  );
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError || err instanceof Error
    ? err.message
    : fallback;
}

/**
 * 一个 provider 一组：状态一行 + 若干字段 + 清除覆盖。
 *
 * 三组上下排布、共用一条滚动，不用页签——三个 provider 是并列的同类项，谁也不比谁
 * 更常用，藏两个在标签后面只是多一次点击。
 *
 * 保存不在这里：整张 sheet 只有脚上那一颗（见 `SiteOAuthForm`）。「清除覆盖」留在
 * 组内，因为它作用于**这一家**且立刻生效，和攒着一起提交的编辑不是一类动作。
 */
function ProviderFields({
  status,
  draft,
  error,
  disabled,
  onChange,
  onClear,
  clearing,
}: {
  status: SiteOAuthProviderStatus;
  draft: ProviderDraft;
  error: string | undefined;
  disabled: boolean;
  onChange: (patch: Partial<ProviderDraft>) => void;
  onClear: () => void;
  clearing: boolean;
}): ReactNode {
  const { t } = useTranslation("site-member");

  const sourceLabel =
    status.source === "tenant"
      ? t("oauthAdmin.source.site")
      : t("oauthAdmin.source.platform");

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-medium">
            {t(`oauthAdmin.providers.${status.provider}`)}
          </h3>
          <p className="text-muted-foreground text-sm">
            {status.enabled
              ? t("oauthAdmin.status.enabled", { source: sourceLabel })
              : t("oauthAdmin.status.disabled")}
          </p>
        </div>
        {status.tenant_configured ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={onClear}
          >
            {clearing && <Spinner />}
            {t("oauthAdmin.clear")}
          </Button>
        ) : null}
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${status.provider}-client-id`}>
            {t("oauthAdmin.fields.clientId")}
          </FieldLabel>
          <Input
            id={`${status.provider}-client-id`}
            value={draft.client_id}
            onChange={(event) => onChange({ client_id: event.target.value })}
            disabled={disabled}
            autoComplete="off"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${status.provider}-client-secret`}>
            {t("oauthAdmin.fields.clientSecret")}
          </FieldLabel>
          <Input
            id={`${status.provider}-client-secret`}
            type="password"
            value={draft.client_secret}
            onChange={(event) =>
              onChange({ client_secret: event.target.value })
            }
            disabled={disabled}
            placeholder={
              status.tenant_configured
                ? t("oauthAdmin.fields.secretPlaceholderKeep")
                : t("oauthAdmin.fields.secretPlaceholder")
            }
            autoComplete="new-password"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${status.provider}-callback`}>
            {t("oauthAdmin.fields.callbackUrl")}
          </FieldLabel>
          <Input
            id={`${status.provider}-callback`}
            value={draft.callback_url}
            onChange={(event) => onChange({ callback_url: event.target.value })}
            disabled={disabled}
            placeholder={t("oauthAdmin.fields.callbackPlaceholder")}
            autoComplete="off"
          />
        </Field>
        {status.provider === "microsoft" ? (
          <Field>
            <FieldLabel htmlFor={`${status.provider}-authority`}>
              {t("oauthAdmin.fields.authority")}
            </FieldLabel>
            <Input
              id={`${status.provider}-authority`}
              value={draft.authority}
              onChange={(event) => onChange({ authority: event.target.value })}
              disabled={disabled}
              placeholder="common"
              autoComplete="off"
            />
          </Field>
        ) : null}
        {error ? <FieldError>{error}</FieldError> : null}
      </FieldGroup>
    </section>
  );
}

/**
 * 三组表单 + 一颗保存。
 *
 * 只提交**改过**的那几家：三家凭证互不相关，一次保存不该把另外两家的空表单也写回去。
 * 逐个串行 PUT，因为三家覆盖存在同一行 `TenantSetting` 上，并发请求会互相覆盖。
 */
function SiteOAuthForm({
  providers,
  onClose,
}: {
  providers: SiteOAuthProviderStatus[];
  onClose: () => void;
}): ReactNode {
  const { t } = useTranslation(["site-member", "common"]);
  const upsert = useUpsertSiteOAuthProvider();
  const clear = useClearSiteOAuthProvider();

  const byProvider = new Map(
    providers.map((entry) => [entry.provider, entry] as const),
  );
  const statuses = {
    github: byProvider.get("github") ?? emptyStatus("github"),
    google: byProvider.get("google") ?? emptyStatus("google"),
    microsoft: byProvider.get("microsoft") ?? emptyStatus("microsoft"),
  } satisfies Record<SiteOAuthProviderId, SiteOAuthProviderStatus>;

  // 基线在打开时定格：之后 provider 状态因清除而变化，也不会把用户输了一半的内容冲掉
  const [baseline, setBaseline] = useState<ProviderDrafts>(() =>
    buildDrafts(statuses),
  );
  const [drafts, setDrafts] = useState<ProviderDrafts>(() =>
    buildDrafts(statuses),
  );
  const [errors, setErrors] = useState<
    Partial<Record<SiteOAuthProviderId, string>>
  >({});
  const [clearing, setClearing] = useState<SiteOAuthProviderId | null>(null);

  const pending = upsert.isPending || clear.isPending;

  function patchDraft(
    provider: SiteOAuthProviderId,
    patch: Partial<ProviderDraft>,
  ): void {
    setDrafts((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], ...patch },
    }));
    setErrors((prev) => ({ ...prev, [provider]: undefined }));
  }

  async function handleClear(provider: SiteOAuthProviderId): Promise<void> {
    setClearing(provider);
    try {
      await clear.mutateAsync(provider);
      const blank = toDraft(emptyStatus(provider));
      setDrafts((prev) => ({ ...prev, [provider]: blank }));
      setBaseline((prev) => ({ ...prev, [provider]: blank }));
      setErrors((prev) => ({ ...prev, [provider]: undefined }));
      toast.success(t("oauthAdmin.toast.cleared"));
    } catch (err) {
      toast.error(errorText(err, t("oauthAdmin.toast.clearFailed")));
    } finally {
      setClearing(null);
    }
  }

  async function handleSave(): Promise<void> {
    const changed = PROVIDER_ORDER.filter((provider) =>
      isDirty(drafts[provider], baseline[provider]),
    );
    if (changed.length === 0) {
      onClose();
      return;
    }

    const incomplete = changed.filter((provider) => {
      const draft = drafts[provider];
      if (!draft.client_id.trim()) return true;
      // 已有覆盖时留空 secret 表示沿用旧的；从没配过则必须一次给全
      return (
        !draft.client_secret.trim() && !statuses[provider].tenant_configured
      );
    });
    if (incomplete.length > 0) {
      setErrors(
        Object.fromEntries(
          incomplete.map((provider) => [provider, t("oauthAdmin.incomplete")]),
        ),
      );
      return;
    }

    try {
      for (const provider of changed) {
        const draft = drafts[provider];
        await upsert.mutateAsync({
          provider,
          body: {
            client_id: draft.client_id.trim(),
            ...(draft.client_secret.trim()
              ? { client_secret: draft.client_secret.trim() }
              : {}),
            callback_url: draft.callback_url.trim() || null,
            authority:
              provider === "microsoft"
                ? draft.authority.trim() || "common"
                : null,
          },
        });
      }
      toast.success(t("oauthAdmin.toast.saved"));
      onClose();
    } catch (err) {
      toast.error(errorText(err, t("oauthAdmin.toast.saveFailed")));
    }
  }

  return (
    <>
      <SheetHeader className="space-y-1 border-b px-4 py-3">
        <SheetTitle>{t("oauthAdmin.heading")}</SheetTitle>
        <SheetDescription>{t("oauthAdmin.description")}</SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-4 py-4">
        {PROVIDER_ORDER.map((provider) => (
          <ProviderFields
            key={provider}
            status={statuses[provider]}
            draft={drafts[provider]}
            error={errors[provider]}
            disabled={pending}
            clearing={clearing === provider}
            onChange={(patch) => patchDraft(provider, patch)}
            onClear={() => void handleClear(provider)}
          />
        ))}
      </div>

      <SheetFooter className="border-t">
        <SheetClose asChild>
          <Button type="button" variant="outline" disabled={pending}>
            {t("common:cancel")}
          </Button>
        </SheetClose>
        <Button
          type="button"
          disabled={pending}
          onClick={() => void handleSave()}
        >
          {upsert.isPending && <Spinner />}
          {t("common:save")}
        </Button>
      </SheetFooter>
    </>
  );
}

/**
 * 触发按钮 + 三组表单内聚在一起；调用方只决定 trigger 长什么样。
 *
 * **没有写权限就别渲染这个组件**（见 `SiteOAuthStatusRow`）——一张全灰的表单比没有
 * 入口更让人困惑；只读用户在状态行上照样看得到哪几家能登。
 */
export function SiteOAuthSheet({
  providers,
  children,
}: {
  providers: SiteOAuthProviderStatus[];
  children?: ReactNode;
}): ReactNode {
  const { t } = useTranslation("site-member");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <Button type="button" variant="outline" size="sm">
            {t("oauthAdmin.configure")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        {/* 只在打开时挂载：关掉即丢弃输入的密钥，下次开是干净的空表单 */}
        {open ? (
          <SiteOAuthForm providers={providers} onClose={() => setOpen(false)} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
