import { useEffect, useState, type ReactNode, type SubmitEvent } from "react";

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
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useNote } from "../hooks/useNote.js";
import { useUpdateNote } from "../hooks/useNoteMutations.js";
import {
  buildNotePayload,
  INITIAL_NOTE_FORM,
  validateNoteForm,
  type NoteFormValues,
} from "../lib/notes.js";

import type { NoteListItem } from "../../shared/index.js";

interface NoteEditSheetProps {
  note: NoteListItem;
  children?: ReactNode;
}

export function NoteEditSheet({ note, children }: NoteEditSheetProps) {
  const { t } = useTranslation("note");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NoteFormValues>(INITIAL_NOTE_FORM);
  const [error, setError] = useState("");
  const { data: noteDetail, isLoading } = useNote(note.id, open);
  const updateMutation = useUpdateNote();

  useEffect(() => {
    if (noteDetail) {
      setForm({
        title: noteDetail.title,
        content: noteDetail.content,
      });
      setError("");
    }
  }, [noteDetail]);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const validationError = validateNoteForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: note.id,
        ...buildNotePayload(form),
      });
      toast.success(t("toastUpdated"));
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
            <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
              <Field>
                <FieldLabel htmlFor={`note-title-${note.id}`}>
                  {t("fieldTitle")}
                </FieldLabel>
                <Input
                  id={`note-title-${note.id}`}
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`note-content-${note.id}`}>
                  {t("fieldContent")}
                </FieldLabel>
                <Textarea
                  id={`note-content-${note.id}`}
                  className="min-h-40"
                  value={form.content}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      content: event.target.value,
                    }))
                  }
                />
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
            </FieldGroup>
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
