import { useState, type ReactNode, type SubmitEvent } from "react";

import { ApiError } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
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
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCreateNote } from "../hooks/useNoteMutations.js";
import {
  buildNotePayload,
  INITIAL_NOTE_FORM,
  validateNoteForm,
  type NoteFormValues,
} from "../lib/notes.js";

interface NoteCreateSheetProps {
  children?: ReactNode;
}

export function NoteCreateSheet({ children }: NoteCreateSheetProps) {
  const { t } = useTranslation("note");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NoteFormValues>(INITIAL_NOTE_FORM);
  const [error, setError] = useState("");
  const createMutation = useCreateNote();

  const reset = () => {
    setForm(INITIAL_NOTE_FORM);
    setError("");
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const validationError = validateNoteForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await createMutation.mutateAsync(buildNotePayload(form));
      toast.success(t("toastCreated"));
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

          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel htmlFor="note-title">{t("fieldTitle")}</FieldLabel>
              <Input
                id="note-title"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="note-content">
                {t("fieldContent")}
              </FieldLabel>
              <Textarea
                id="note-content"
                className="min-h-40"
                value={form.content}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, content: event.target.value }))
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
