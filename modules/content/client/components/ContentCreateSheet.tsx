import { useState, type ReactNode, type SubmitEvent } from "react";

import {
  ApiError,
  FieldInfoTip,
  snapshotInputFiles,
} from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Checkbox } from "@rewindom/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
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
import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import {
  useAddContentFileAsset,
  useAddContentTextAsset,
  useCreateContent,
  useGenerateContent,
} from "../hooks/useContentMutations.js";
import {
  CONTENT_UPLOAD_ACCEPT,
  INITIAL_CONTENT_FORM,
  buildContentPayload,
  validateContentForm,
  type ContentFormValues,
} from "../lib/contents.js";

import { ContentFormatField } from "./ContentFormatField.js";

interface ContentCreateSheetProps {
  children?: ReactNode;
}

export function ContentCreateSheet({ children }: ContentCreateSheetProps) {
  const { t } = useTranslation("content");
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ContentFormValues>(INITIAL_CONTENT_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [extraText, setExtraText] = useState("");
  const [generateNow, setGenerateNow] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const createMutation = useCreateContent();
  const uploadMutation = useAddContentFileAsset();
  const textMutation = useAddContentTextAsset();
  const generateMutation = useGenerateContent();

  const reset = () => {
    setForm(INITIAL_CONTENT_FORM);
    setFiles([]);
    setExtraText("");
    setGenerateNow(true);
    setError("");
    setPending(false);
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const hasSource =
      Boolean(form.brief.trim()) ||
      files.length > 0 ||
      Boolean(extraText.trim());
    const validationError = validateContentForm(form, t, {
      requireSource: !hasSource,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(true);
    try {
      const created = await createMutation.mutateAsync(
        buildContentPayload(form),
      );
      for (const file of files) {
        await uploadMutation.mutateAsync({ id: created.id, file });
      }
      if (extraText.trim()) {
        await textMutation.mutateAsync({
          id: created.id,
          text_body: extraText,
        });
      }
      if (generateNow) {
        await generateMutation.mutateAsync(created.id);
        toast.success(t("toastGenerateStarted"));
      } else {
        toast.success(t("toastCreated"));
      }
      setOpen(false);
      reset();
      void navigate(`/app/contents/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("createFailed"));
      setPending(false);
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
            <ContentFormatField
              id="content-format"
              value={form.format}
              onChange={(format) => setForm((prev) => ({ ...prev, format }))}
              disabled={pending}
            />
            <Field>
              <FieldLabel
                htmlFor="content-brief"
                className="flex items-center gap-1"
              >
                {t("fieldBrief")}
                <FieldInfoTip text={t("fieldBriefTip")} />
              </FieldLabel>
              <Textarea
                id="content-brief"
                className="min-h-32"
                value={form.brief}
                disabled={pending}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, brief: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel className="flex items-center gap-1">
                {t("fieldAssets")}
                <FieldInfoTip text={t("fieldAssetsTip")} />
              </FieldLabel>
              <input
                type="file"
                accept={CONTENT_UPLOAD_ACCEPT}
                multiple
                disabled={pending}
                className="text-sm"
                onChange={(event) => {
                  const next = snapshotInputFiles(event.currentTarget);
                  setFiles((prev) => [...prev, ...next]);
                }}
              />
              {files.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate">{file.name}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={pending}
                        onClick={() =>
                          setFiles((prev) =>
                            prev.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="content-extra-text">
                {t("addText")}
              </FieldLabel>
              <Textarea
                id="content-extra-text"
                className="min-h-24"
                placeholder={t("textPlaceholder")}
                value={extraText}
                disabled={pending}
                onChange={(event) => setExtraText(event.target.value)}
              />
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="content-generate-now"
                checked={generateNow}
                disabled={pending}
                onCheckedChange={(checked) => setGenerateNow(checked === true)}
              />
              <FieldLabel htmlFor="content-generate-now">
                {t("generateNow")}
              </FieldLabel>
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                {t("cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner className="size-4" /> : null}
              {generateNow ? t("generate") : t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
