import { useEffect, useState, type ReactNode, type SubmitEvent } from "react";

import { ApiError } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { FieldError, FieldGroup } from "@rewindom/ui/field";
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

import { useUpdateEventFeed } from "../hooks/useEventFeedMutations.js";
import {
  buildEventFeedPayload,
  validateEventFeedForm,
  type EventFeedFormValues,
} from "../lib/event-feeds.js";

import { EventFeedFields } from "./EventFeedFields.js";

import type { EventFeedItem } from "../../shared/index.js";

interface EventFeedEditSheetProps {
  feed: EventFeedItem;
  children?: ReactNode;
}

export function EventFeedEditSheet({
  feed,
  children,
}: EventFeedEditSheetProps) {
  const { t } = useTranslation("events");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EventFeedFormValues>(fromFeed(feed));
  const [error, setError] = useState("");
  const updateMutation = useUpdateEventFeed();

  useEffect(() => {
    if (open) {
      setForm(fromFeed(feed));
      setError("");
    }
  }, [feed, open]);

  const handleSubmit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const validationError = validateEventFeedForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const payload = buildEventFeedPayload(form);
      await updateMutation.mutateAsync({
        feedId: feed.id,
        name: payload.name,
        url: payload.url,
        source_kind: payload.source_kind,
        topic: payload.topic,
      });
      toast.success(t("sources.toastUpdated"));
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("sources.updateFailed"));
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <Button size="icon" variant="ghost" aria-label={t("sources.editAriaLabel")}>
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{t("sources.editTitle")}</SheetTitle>
            <SheetDescription>{t("sources.editDescription")}</SheetDescription>
          </SheetHeader>
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <EventFeedFields
              form={form}
              onChange={setForm}
              showUrl={feed.connector === "rss"}
              idPrefix={`feed-${feed.id}`}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("sources.cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Spinner className="size-4" /> : null}
              {t("sources.save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function fromFeed(feed: EventFeedItem): EventFeedFormValues {
  return {
    connector: feed.connector,
    name: feed.name,
    url: feed.url,
    source_kind: feed.source_kind,
    topic: feed.topic,
  };
}
