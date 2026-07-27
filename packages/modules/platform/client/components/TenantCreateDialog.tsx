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

import { useCreatePlatformTenant } from "../hooks/usePlatformTenants.js";

import { TenantAdminCredentialsPanel } from "./TenantAdminCredentialsPanel.js";

import type { TenantAdminCredentials } from "../../shared/index.js";

export function TenantCreateDialog() {
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
      toast.success("租户已创建");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "创建失败");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" />
          新建租户
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
              <DialogTitle>新建租户</DialogTitle>
            </DialogHeader>
            <form onSubmit={(event) => void handleCreate(event)}>
              <FieldGroup className="mb-4">
                <Field>
                  <FieldLabel htmlFor="tenant-slug">标识 (slug)</FieldLabel>
                  <Input
                    id="tenant-slug"
                    placeholder="acme"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                  <FieldDescription>用户登录格式：用户名@acme</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="tenant-name">名称</FieldLabel>
                  <Input
                    id="tenant-name"
                    placeholder="Acme 公司"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="tenant-remark">备注</FieldLabel>
                  <Textarea
                    id="tenant-remark"
                    placeholder="可选，支持多行"
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
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !slug || !name}
                >
                  创建
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
