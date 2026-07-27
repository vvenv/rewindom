import { useState, type SubmitEvent } from "react";

import { ApiError } from "@be-water/client-kit";
import { DEFAULT_TENANT_SLUG, assertValidTenantSlug  } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { Textarea } from "@be-water/ui/textarea";
import { toast } from "@be-water/ui/toast";
import { Pencil } from "lucide-react";

import { type TenantSummary } from "../../shared/index.js";
import { usePatchPlatformTenant } from "../hooks/usePlatformTenants.js";

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
  const patchMutation = usePatchPlatformTenant();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [remark, setRemark] = useState("");
  const slugLocked = tenant.slug === DEFAULT_TENANT_SLUG;

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSlug(tenant.slug);
      setName(tenant.name);
      setRemark(tenant.remark ?? "");
    }
  };

  const handleSave = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("租户名称不能为空");
      return;
    }

    const trimmedSlug = slug.trim();
    if (!slugLocked) {
      if (!trimmedSlug) {
        toast.error("租户标识不能为空");
        return;
      }
      try {
        assertValidTenantSlug(trimmedSlug);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "租户标识格式无效");
        return;
      }
    }

    onActingChange?.(true);
    try {
      await patchMutation.mutateAsync({
        id: tenant.id,
        body: {
          ...(!slugLocked ? { slug: trimmedSlug } : {}),
          name: trimmedName,
          remark: remark.trim() || null,
        },
      });
      toast.success("租户信息已保存");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "保存失败");
    } finally {
      onActingChange?.(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Pencil className="size-3.5" />
          编辑
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="shrink-0 border-b pb-4">
          <SheetTitle className="pr-8">编辑租户 — {tenant.slug}</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={(event) => void handleSave(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <Field>
              <FieldLabel htmlFor={`edit-tenant-slug-${tenant.id}`}>
                标识 (slug)
              </FieldLabel>
              <Input
                id={`edit-tenant-slug-${tenant.id}`}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={slugLocked}
              />
              {slugLocked ? (
                <FieldDescription>默认租户标识不可修改</FieldDescription>
              ) : (
                <FieldDescription>
                  用户登录格式：用户名@{slug.trim() || "标识"}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-tenant-name-${tenant.id}`}>
                名称
              </FieldLabel>
              <Input
                id={`edit-tenant-name-${tenant.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-tenant-remark-${tenant.id}`}>
                备注
              </FieldLabel>
              <Textarea
                id={`edit-tenant-remark-${tenant.id}`}
                placeholder="支持多行文本"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={5}
              />
            </Field>
          </FieldGroup>
          <SheetFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={patchMutation.isPending}>
              保存
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
