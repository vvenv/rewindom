import { useState, type SubmitEvent } from "react";


import { ApiError } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@be-water/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import { Textarea } from "@be-water/ui/textarea";
import { toast } from "@be-water/ui/toast";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCreatePlatformTenant } from "../hooks/usePlatformTenants.js";

import { TenantAdminCredentialsPanel } from "./TenantAdminCredentialsPanel.js";

import type { TenantAdminCredentials } from "../../shared/index.js";

export function TenantCreateDialog() {
  const { t } = useTranslation(["platform", "common"]);
  const createMutation = useCreatePlatformTenant();
  const [open, setOpen] = useState(false);
  const [credentials, setCredentials] = useState<TenantAdminCredentials | null>(
    null,
  );
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [remark, setRemark] = useState("");

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSlug("");
      setName("");
      setRemark("");
      setCredentials(null);
    }
  };

  const handleCreate = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    try {
      const tenant = await createMutation.mutateAsync({
        slug,
        name,
        remark: remark.trim() || null,
      });
      setCredentials(tenant.admin);
      toast.success(t("tenants.created"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("tenants.createFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" />
          {t("tenants.create")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        {credentials ? (
          <TenantAdminCredentialsPanel
            credentials={credentials}
            onClose={() => setOpen(false)}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("tenants.createTitle")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(event) => void handleCreate(event)}>
              <FieldGroup className="mb-4">
                <Field>
                  <FieldLabel htmlFor="tenant-slug">{t("tenants.slugField")}</FieldLabel>
                  <Input
                    id="tenant-slug"
                    placeholder="acme"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                  <FieldDescription>{t("tenants.slugDescriptionGeneric")}</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="tenant-name">{t("tenants.name")}</FieldLabel>
                  <Input
                    id="tenant-name"
                    placeholder={t("tenants.namePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="tenant-remark">{t("tenants.remark")}</FieldLabel>
                  <Textarea
                    id="tenant-remark"
                    placeholder={t("tenants.remarkPlaceholder")}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    rows={3}
                  />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  {t("common:cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !slug || !name}
                >
                  {createMutation.isPending ? t("tenants.creating") : t("common:create")}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
