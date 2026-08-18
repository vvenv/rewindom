import { useState, type SubmitEvent } from "react";

import { ApiError } from "@rewindom/client-kit";
import { DEFAULT_TENANT_SLUG, assertValidTenantSlug  } from "@rewindom/shared";
import { Button } from "@rewindom/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { Textarea } from "@rewindom/ui/textarea";
import { toast } from "@rewindom/ui/toast";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type TenantSummary } from "../../shared/index.js";
import { usePatchPlatformTenant } from "../hooks/usePlatformTenants.js";

import { TenantIssueCertificateButton } from "./TenantIssueCertificateButton.js";

interface TenantEditSheetProps {
  tenant: TenantSummary;
  disabled?: boolean;
  onActingChange?: (acting: boolean) => void;
}

export function TenantEditSheet({
  tenant,
  disabled = false,
  onActingChange,
}: TenantEditSheetProps) {
  const { t } = useTranslation(["platform", "common"]);
  const patchMutation = usePatchPlatformTenant();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [remark, setRemark] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const slugLocked = tenant.slug === DEFAULT_TENANT_SLUG;

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSlug(tenant.slug);
      setName(tenant.name);
      setRemark(tenant.remark ?? "");
      setCustomDomain(tenant.custom_domain ?? "");
    }
  };

  const handleSave = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(t("tenants.edit.nameRequired"));
      return;
    }

    const trimmedSlug = slug.trim();
    if (!slugLocked) {
      if (!trimmedSlug) {
        toast.error(t("tenants.edit.slugRequired"));
        return;
      }
      try {
        assertValidTenantSlug(trimmedSlug);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("tenants.edit.slugInvalid"),
        );
        return;
      }
    }

    const trimmedDomain = customDomain.trim();
    const nextDomain = trimmedDomain.length > 0 ? trimmedDomain : null;

    onActingChange?.(true);
    try {
      await patchMutation.mutateAsync({
        id: tenant.id,
        body: {
          ...(!slugLocked ? { slug: trimmedSlug } : {}),
          name: trimmedName,
          remark: remark.trim() || null,
          custom_domain: nextDomain,
        },
      });
      toast.success(t("tenants.edit.saved"));
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common:saveFailed"));
    } finally {
      onActingChange?.(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Pencil className="size-3.5" />
          {t("tenants.edit.trigger")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="shrink-0 border-b pb-4">
          <SheetTitle className="pr-8">
            {t("tenants.edit.title", { slug: tenant.slug })}
          </SheetTitle>
        </SheetHeader>
        <form
          onSubmit={(event) => void handleSave(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <Field>
              <FieldLabel htmlFor={`edit-tenant-slug-${tenant.id}`}>
                {t("tenants.slugField")}
              </FieldLabel>
              <Input
                id={`edit-tenant-slug-${tenant.id}`}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={slugLocked}
              />
              {slugLocked ? (
                <FieldDescription>
                  {t("tenants.edit.defaultSlugLocked")}
                </FieldDescription>
              ) : (
                <FieldDescription>
                  {t("tenants.slugDescription", {
                    slug: slug.trim() || t("tenants.slug"),
                  })}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-tenant-name-${tenant.id}`}>
                {t("tenants.name")}
              </FieldLabel>
              <Input
                id={`edit-tenant-name-${tenant.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-tenant-remark-${tenant.id}`}>
                {t("tenants.remark")}
              </FieldLabel>
              <Textarea
                id={`edit-tenant-remark-${tenant.id}`}
                placeholder={t("tenants.remarkMultilinePlaceholder")}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={5}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-tenant-domain-${tenant.id}`}>
                {t("tenants.customDomain")}
              </FieldLabel>
              <Input
                id={`edit-tenant-domain-${tenant.id}`}
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder={t("tenants.customDomainPlaceholder")}
                autoComplete="off"
                spellCheck={false}
              />
              <FieldDescription>
                {t("tenants.customDomainDescription")}
              </FieldDescription>
              <TenantIssueCertificateButton
                tenant={tenant}
                disabled={disabled || patchMutation.isPending}
              />
            </Field>
          </FieldGroup>
          <SheetFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              disabled={patchMutation.isPending}
              onClick={() => setOpen(false)}
            >
              {t("common:cancel")}
            </Button>
            <Button type="submit" disabled={patchMutation.isPending}>
              {patchMutation.isPending && <Spinner />}
              {t("common:save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
