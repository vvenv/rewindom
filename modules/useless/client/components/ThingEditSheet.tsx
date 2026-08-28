import { useEffect, useState, type ReactNode, type SubmitEvent } from "react";

import { ApiError } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useThing } from "../hooks/useThing.js";
import { useUpdateThing } from "../hooks/useThingMutations.js";
import {
  buildThingPayload,
  INITIAL_THING_FORM,
  validateThingForm,
  type ThingFormValues,
} from "../lib/things.js";

import { ThingFields } from "./ThingFields.js";

import type { ThingListItem } from "../../shared/index.js";

interface ThingEditSheetProps {
  item: ThingListItem;
  children?: ReactNode;
}

export function ThingEditSheet({ item, children }: ThingEditSheetProps) {
  const { t } = useTranslation("useless");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ThingFormValues>(INITIAL_THING_FORM);
  const [error, setError] = useState("");
  const { data: detail, isLoading } = useThing(item.id, open);
  const updateMutation = useUpdateThing();

  useEffect(() => {
    if (detail) {
      setForm({
        kind: detail.kind,
        title: detail.title,
        text: detail.text,
        html: detail.html,
        published_on: detail.published_on ?? "",
        enabled: detail.enabled,
      });
      setError("");
    }
  }, [detail]);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const validationError = validateThingForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: item.id,
        ...buildThingPayload(form),
      });
      toast.success(t("updated"));
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("updateFailed"));
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <Button size="icon" variant="ghost" aria-label={t("editAriaLabel")}>
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{t("editTitle")}</SheetTitle>
            <SheetDescription>{t("editDescription")}</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : (
            <ThingFields
              form={form}
              onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              error={error}
              idPrefix={`thing-${item.id}`}
            />
          )}

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("cancel")}
              </Button>
            </SheetClose>
            <Button
              type="submit"
              disabled={updateMutation.isPending || isLoading}
            >
              {updateMutation.isPending ? <Spinner className="size-4" /> : null}
              {t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
