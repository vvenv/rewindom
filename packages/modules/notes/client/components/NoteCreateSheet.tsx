import { useState, type ReactNode, type SubmitEvent } from "react";

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
import { Plus } from "lucide-react";

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
    const validationError = validateNoteForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await createMutation.mutateAsync(buildNotePayload(form));
      toast.success("笔记已创建");
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "创建失败，请重试");
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
            新建笔记
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>新建笔记</SheetTitle>
            <SheetDescription>记录租户内的简单备忘信息。</SheetDescription>
          </SheetHeader>

          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel htmlFor="note-title">标题</FieldLabel>
              <Input
                id="note-title"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="note-content">内容</FieldLabel>
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
                取消
              </Button>
            </SheetClose>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner className="size-4" /> : null}
              保存
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
