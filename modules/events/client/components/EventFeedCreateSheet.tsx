import { useState, type ReactNode, type SubmitEvent } from "react";

import { ApiError, FieldInfoTip } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
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

import { useCreateEventFeed } from "../hooks/useEventFeedMutations.js";
import {
  INITIAL_EVENT_FEED_FORM,
  buildEventFeedPayload,
  validateEventFeedForm,
  type EventFeedFormValues,
} from "../lib/event-feeds.js";

import { EventFeedFields } from "./EventFeedFields.js";

interface EventFeedCreateSheetProps {
  children?: ReactNode;
}

export function EventFeedCreateSheet({ children }: EventFeedCreateSheetProps) {
  const { t } = useTranslation("events");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EventFeedFormValues>(INITIAL_EVENT_FEED_FORM);
  const [error, setError] = useState("");
  const createMutation = useCreateEventFeed();

  const reset = (): void => {
    setForm(INITIAL_EVENT_FEED_FORM);
    setError("");
  };

  const handleSubmit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const validationError = validateEventFeedForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await createMutation.mutateAsync(buildEventFeedPayload(form));
      toast.success(t("sources.toastCreated"));
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("sources.createFailed"));
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
            {t("sources.create")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{t("sources.createTitle")}</SheetTitle>
            <SheetDescription>{t("sources.createDescription")}</SheetDescription>
          </SheetHeader>
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel className="flex items-center gap-1">
                {t("sources.fieldConnector")}
                <FieldInfoTip text={t("sources.connectorInfo")} />
              </FieldLabel>
              <Select
                value={form.connector}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    connector: value as EventFeedFormValues["connector"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rss">{t("sources.connectorRss")}</SelectItem>
                  <SelectItem value="hackernews">
                    {t("sources.connectorHackerNews")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <EventFeedFields
              form={form}
              onChange={setForm}
              showUrl={form.connector === "rss"}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("sources.cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner className="size-4" /> : null}
              {t("sources.save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
