import { useState, type ReactNode, type SubmitEvent } from "react";

import { ApiError } from "@be-water/module-sdk/client";
import { Button } from "@be-water/ui/button";
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
import { toast } from "@be-water/ui/toast";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCreateBookmark } from "../hooks/useBookmarkMutations.js";
import {
  buildBookmarkPayload,
  INITIAL_BOOKMARK_FORM,
  validateBookmarkForm,
  type BookmarkFormValues,
} from "../lib/bookmarks.js";

import { BookmarkFormFields } from "./BookmarkFormFields.js";

interface BookmarkCreateSheetProps {
  children?: ReactNode;
}

export function BookmarkCreateSheet({ children }: BookmarkCreateSheetProps) {
  const { t } = useTranslation("bookmark");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BookmarkFormValues>(INITIAL_BOOKMARK_FORM);
  const [error, setError] = useState("");
  const createMutation = useCreateBookmark();

  const reset = () => {
    setForm(INITIAL_BOOKMARK_FORM);
    setError("");
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const validationError = validateBookmarkForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await createMutation.mutateAsync(buildBookmarkPayload(form));
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

          <BookmarkFormFields
            idPrefix="bookmark-create"
            values={form}
            error={error}
            onChange={setForm}
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
