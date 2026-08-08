import { useState, type ReactNode, type SubmitEvent } from "react";

import { api, ApiError } from "@be-water/module-sdk/client";
import { Button } from "@be-water/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@be-water/ui/field";
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
import { Textarea } from "@be-water/ui/textarea";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";

import type { Bookmark } from "../../shared/index.js";

interface BookmarkCreateSheetProps {
  children?: ReactNode;
  onCreated?: () => void;
}

interface BookmarkFormValues {
  url: string;
  title: string;
  description: string;
}

const INITIAL_FORM: BookmarkFormValues = {
  url: "",
  title: "",
  description: "",
};

export function BookmarkCreateSheet({
  children,
  onCreated,
}: BookmarkCreateSheetProps) {
  const { t } = useTranslation("bookmark");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BookmarkFormValues>(INITIAL_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setForm(INITIAL_FORM);
    setError("");
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    if (!form.url.trim()) {
      setError(t("urlRequired"));
      return;
    }
    if (!form.title.trim()) {
      setError(t("titleRequired"));
      return;
    }

    setSubmitting(true);
    try {
      await api.post<Bookmark>("/bookmarks", {
        url: form.url.trim(),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
      });
      toast.success(t("created"));
      setOpen(false);
      reset();
      onCreated?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("createFailed"));
    } finally {
      setSubmitting(false);
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
        {children ?? <Button>{t("create")}</Button>}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{t("createTitle")}</SheetTitle>
            <SheetDescription>{t("createDescription")}</SheetDescription>
          </SheetHeader>

          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel htmlFor="bookmark-url">{t("url")}</FieldLabel>
              <Input
                id="bookmark-url"
                placeholder={t("urlPlaceholder")}
                value={form.url}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, url: e.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bookmark-title">
                {t("titleField")}
              </FieldLabel>
              <Input
                id="bookmark-title"
                placeholder={t("titlePlaceholder")}
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bookmark-description">
                {t("description")}
              </FieldLabel>
              <Textarea
                id="bookmark-description"
                placeholder={t("descriptionPlaceholder")}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner className="size-4" /> : null}
              {t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
