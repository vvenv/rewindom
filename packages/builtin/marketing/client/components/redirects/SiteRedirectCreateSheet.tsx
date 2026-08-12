import { useState, type ReactElement, type ReactNode } from "react";

import { ApiError } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
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
import { Switch } from "@be-water/ui/switch";
import { toast } from "@be-water/ui/toast";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSaveSiteRedirect } from "../../hooks/useSiteRedirects.js";

/** trigger + 表单 + mutation + toast 内聚在一个组件里（弹层内聚金标准）。 */
export function SiteRedirectCreateSheet({
  children,
}: {
  children?: ReactNode;
}): ReactElement {
  const { t } = useTranslation(["marketing", "common"]);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [permanent, setPermanent] = useState(true);
  const save = useSaveSiteRedirect();

  const reset = (): void => {
    setFrom("");
    setTo("");
    setPermanent(true);
  };

  const submit = async (): Promise<void> => {
    try {
      await save.mutateAsync({
        from_path: from,
        to_path: to,
        status_code: permanent ? 301 : 302,
      });
      toast.success(t("redirects.saved"));
      setOpen(false);
      reset();
    } catch (error) {
      // 服务端的校验文案已经解释了「哪里不合法」，原样透出比再编一句准确
      toast.error(
        error instanceof ApiError ? error.message : t("redirects.saveFailed"),
      );
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <SheetTrigger asChild>
        {children ?? (
          <Button>
            <Plus className="size-4" />
            {t("redirects.create")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form
          className="flex h-full flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <SheetHeader>
            <SheetTitle>{t("redirects.create")}</SheetTitle>
            <SheetDescription>{t("redirects.createHint")}</SheetDescription>
          </SheetHeader>
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel htmlFor="redirect-from">
                {t("redirects.from")}
              </FieldLabel>
              <Input
                id="redirect-from"
                value={from}
                required
                placeholder="/old-pricing"
                onChange={(event) => setFrom(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="redirect-to">{t("redirects.to")}</FieldLabel>
              <Input
                id="redirect-to"
                value={to}
                required
                placeholder="/pricing"
                onChange={(event) => setTo(event.target.value)}
              />
            </Field>
            <Field>
              <div className="flex items-center justify-between gap-3">
                <FieldLabel htmlFor="redirect-permanent">
                  {t("redirects.permanent")}
                </FieldLabel>
                <Switch
                  id="redirect-permanent"
                  checked={permanent}
                  onCheckedChange={setPermanent}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {t("redirects.permanentHint")}
              </p>
            </Field>
          </FieldGroup>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={save.isPending}>
                {t("common:cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner />}
              {t("cms.save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
