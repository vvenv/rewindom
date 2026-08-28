import { useState, type ReactNode, type SubmitEvent } from "react";

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
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCreateThing } from "../hooks/useThingMutations.js";
import {
  buildThingPayload,
  INITIAL_THING_FORM,
  validateThingForm,
  type ThingFormValues,
} from "../lib/things.js";

import { ThingFields } from "./ThingFields.js";

interface ThingCreateSheetProps {
  children?: ReactNode;
}

export function ThingCreateSheet({ children }: ThingCreateSheetProps) {
  const { t } = useTranslation("useless");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ThingFormValues>(INITIAL_THING_FORM);
  const [error, setError] = useState("");
  const createMutation = useCreateThing();

  const reset = () => {
    setForm(INITIAL_THING_FORM);
    setError("");
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const validationError = validateThingForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await createMutation.mutateAsync(buildThingPayload(form));
      toast.success(t("created"));
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("createFailed"));
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <SheetTrigger asChild>
        {children ?? (
          <Button>
            <Plus className="size-4" />
            {t("create")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{t("createTitle")}</SheetTitle>
            <SheetDescription>{t("createDescription")}</SheetDescription>
          </SheetHeader>

          <ThingFields
            form={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            error={error}
            idPrefix="thing-new"
          />

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner className="size-4" /> : null}
              {t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
