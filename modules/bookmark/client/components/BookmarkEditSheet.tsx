import { useEffect, useState, type ReactNode, type SubmitEvent } from "react";

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
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useBookmark } from "../hooks/useBookmark.js";
import { useUpdateBookmark } from "../hooks/useBookmarkMutations.js";
import {
  buildBookmarkPayload,
  INITIAL_BOOKMARK_FORM,
  validateBookmarkForm,
  type BookmarkFormValues,
} from "../lib/bookmarks.js";

import { BookmarkFormFields } from "./BookmarkFormFields.js";

import type { BookmarkListItem } from "../../shared/index.js";

interface BookmarkEditSheetProps {
  bookmark: BookmarkListItem;
  children?: ReactNode;
}

export function BookmarkEditSheet({
  bookmark,
  children,
}: BookmarkEditSheetProps) {
  const { t } = useTranslation("bookmark");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BookmarkFormValues>(INITIAL_BOOKMARK_FORM);
  const [error, setError] = useState("");
  // 列表项只带描述摘要，编辑要完整描述，所以打开时才拉详情。
  const { data: detail, isLoading } = useBookmark(bookmark.id, open);
  const updateMutation = useUpdateBookmark();

  useEffect(() => {
    if (detail) {
      setForm({
        url: detail.url,
        title: detail.title,
        description: detail.description,
      });
      setError("");
    }
  }, [detail]);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const validationError = validateBookmarkForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: bookmark.id,
        ...buildBookmarkPayload(form),
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
            <BookmarkFormFields
              idPrefix={`bookmark-edit-${bookmark.id}`}
              values={form}
              error={error}
              onChange={setForm}
            />
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
