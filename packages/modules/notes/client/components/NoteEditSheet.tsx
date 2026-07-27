import { useEffect, useState, type ReactNode, type SubmitEvent } from "react";

import { ApiError } from "@be-water/client-kit";
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
import { Pencil } from "lucide-react";

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
    const validationError = validateNoteForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: note.id,
        ...buildNotePayload(form),
      });
      toast.success("笔记已更新");
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "更新失败，请重试");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <Button size="icon" variant="ghost" aria-label="编辑笔记">
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>编辑笔记</SheetTitle>
            <SheetDescription>更新标题与正文内容。</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : (
            <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
              <Field>
                <FieldLabel htmlFor={`note-title-${note.id}`}>标题</FieldLabel>
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
                  内容
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
                取消
              </Button>
            </SheetClose>
            <Button
              type="submit"
              disabled={updateMutation.isPending || isLoading}
            >
              {updateMutation.isPending ? <Spinner className="size-4" /> : null}
              保存
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
