import { useEffect, useState, type ReactNode, type SubmitEvent } from "react";

import { ApiError, FieldInfoTip } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
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
import { Textarea } from "@rewindom/ui/textarea";
import { toast } from "@rewindom/ui/toast";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useUpdateEvent } from "../hooks/useEventMutations.js";
import {
  buildEventUpdatePayload,
  validateEventEditForm,
  type EventEditFormValues,
} from "../lib/event-edit.js";
import { EVENT_TOPIC_ORDER } from "../lib/events.js";

import type { EventDetail } from "../../shared/index.js";

interface EventEditSheetProps {
  event: EventDetail;
  children?: ReactNode;
}

export function EventEditSheet({ event, children }: EventEditSheetProps) {
  const { t } = useTranslation("events");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EventEditFormValues>(fromEvent(event));
  const [error, setError] = useState("");
  const updateMutation = useUpdateEvent();

  useEffect(() => {
    if (open) {
      setForm(fromEvent(event));
      setError("");
    }
  }, [event, open]);

  const handleSubmit = async (submitEvent: SubmitEvent): Promise<void> => {
    submitEvent.preventDefault();
    const validationError = validateEventEditForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        eventId: event.id,
        ...buildEventUpdatePayload(form),
      });
      toast.success(t("edit.toastUpdated"));
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("edit.updateFailed"));
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <Button variant="outline" aria-label={t("edit.ariaLabel")}>
            <Pencil className="size-4" />
            {t("edit.action")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{t("edit.title")}</SheetTitle>
            <SheetDescription>{t("edit.description")}</SheetDescription>
          </SheetHeader>

          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel htmlFor={`event-title-${event.id}`}>
                {t("edit.fieldTitle")}
              </FieldLabel>
              <Input
                id={`event-title-${event.id}`}
                value={form.title}
                onChange={(change) =>
                  setForm((prev) => ({ ...prev, title: change.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel
                htmlFor={`event-summary-${event.id}`}
                className="flex items-center gap-1"
              >
                {t("edit.fieldSummary")}
                <FieldInfoTip text={t("edit.summaryInfo")} />
              </FieldLabel>
              <Textarea
                id={`event-summary-${event.id}`}
                className="min-h-40"
                value={form.summary}
                onChange={(change) =>
                  setForm((prev) => ({
                    ...prev,
                    summary: change.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel>{t("edit.fieldTopic")}</FieldLabel>
              <Select
                value={form.topic}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    topic: value as EventEditFormValues["topic"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TOPIC_ORDER.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {t(`topic.${topic}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("edit.cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Spinner className="size-4" /> : null}
              {t("edit.save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function fromEvent(event: EventDetail): EventEditFormValues {
  return {
    title: event.title,
    summary: event.summary,
    topic: event.topic,
  };
}
