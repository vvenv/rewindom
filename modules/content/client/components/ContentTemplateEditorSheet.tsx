import { useEffect, useState, type SubmitEvent } from "react";

import { ApiError, FieldInfoTip } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { Separator } from "@rewindom/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { Textarea } from "@rewindom/ui/textarea";
import { toast } from "@rewindom/ui/toast";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  CONTENT_TEMPLATE_SAMPLES_MAX,
  type ContentOutputRules,
} from "../../shared/index.js";
import { useContentTemplate } from "../hooks/useContentTemplates.js";
import {
  useCreateContentTemplate,
  useUpdateContentTemplate,
} from "../hooks/useContentTemplateMutations.js";
import {
  INITIAL_TEMPLATE_FORM,
  buildTemplatePayload,
  templateToForm,
  validateTemplateForm,
  type TemplateFormValues,
} from "../lib/content-templates.js";

import { ContentFormatField } from "./ContentFormatField.js";
import { ContentTemplateFieldsEditor } from "./ContentTemplateFieldsEditor.js";

interface ContentTemplateEditorSheetProps {
  /** 有 id = 改已有模板；null = 新建。 */
  templateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 数值输入：空串按 0（= 不限）读，不让 NaN 漏进表单。 */
function ruleNumber(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function ContentTemplateEditorSheet({
  templateId,
  open,
  onOpenChange,
}: ContentTemplateEditorSheetProps) {
  const { t } = useTranslation("content");
  const [form, setForm] = useState<TemplateFormValues>(INITIAL_TEMPLATE_FORM);
  const [error, setError] = useState("");
  const query = useContentTemplate(open ? templateId : null);
  const createMutation = useCreateContentTemplate();
  const updateMutation = useUpdateContentTemplate();
  const pending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(query.data ? templateToForm(query.data) : INITIAL_TEMPLATE_FORM);
  }, [open, query.data]);

  const patchRules = (patch: Partial<ContentOutputRules>) => {
    setForm((prev) => ({
      ...prev,
      output_rules: { ...prev.output_rules, ...patch },
    }));
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const validationError = validateTemplateForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      const payload = buildTemplatePayload(form);
      if (templateId) {
        await updateMutation.mutateAsync({ id: templateId, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(t("template.toastSaved"));
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t("template.saveFailed"),
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>
              {templateId ? t("template.editTitle") : t("template.createTitle")}
            </SheetTitle>
            <SheetDescription>{t("template.editDescription")}</SheetDescription>
          </SheetHeader>

          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel htmlFor="template-name">
                {t("template.name")}
              </FieldLabel>
              <Input
                id="template-name"
                value={form.name}
                disabled={pending}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="template-description">
                {t("template.description")}
              </FieldLabel>
              <Input
                id="template-description"
                placeholder={t("template.descriptionPlaceholder")}
                value={form.description}
                disabled={pending}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </Field>
            <ContentFormatField
              id="template-format"
              value={form.format}
              disabled={pending}
              onChange={(format) => setForm((prev) => ({ ...prev, format }))}
            />

            <Separator />

            <Field>
              <FieldLabel className="flex items-center gap-1">
                {t("template.fieldsSection")}
                <FieldInfoTip text={t("template.fieldsSectionTip")} />
              </FieldLabel>
              <ContentTemplateFieldsEditor
                fields={form.fields}
                disabled={pending}
                onChange={(fields) => setForm((prev) => ({ ...prev, fields }))}
              />
            </Field>

            <Separator />

            <Field>
              <FieldLabel
                htmlFor="template-guidelines"
                className="flex items-center gap-1"
              >
                {t("template.guidelines")}
                <FieldInfoTip text={t("template.guidelinesTip")} />
              </FieldLabel>
              <Textarea
                id="template-guidelines"
                className="min-h-40"
                placeholder={t("template.guidelinesPlaceholder")}
                value={form.guidelines}
                disabled={pending}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    guidelines: event.target.value,
                  }))
                }
              />
            </Field>

            <Separator />

            <Field>
              <FieldLabel className="flex items-center gap-1">
                {t("template.outputRules")}
                <FieldInfoTip text={t("template.outputRulesTip")} />
              </FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="template-title-max">
                    {t("template.titleMax")}
                  </FieldLabel>
                  <Input
                    id="template-title-max"
                    type="number"
                    min={0}
                    value={form.output_rules.title_max || ""}
                    disabled={pending}
                    onChange={(event) =>
                      patchRules({ title_max: ruleNumber(event.target.value) })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="template-tone">
                    {t("template.tone")}
                  </FieldLabel>
                  <Input
                    id="template-tone"
                    placeholder={t("template.tonePlaceholder")}
                    value={form.output_rules.tone}
                    disabled={pending}
                    onChange={(event) =>
                      patchRules({ tone: event.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="template-body-min">
                    {t("template.bodyMin")}
                  </FieldLabel>
                  <Input
                    id="template-body-min"
                    type="number"
                    min={0}
                    value={form.output_rules.body_min || ""}
                    disabled={pending}
                    onChange={(event) =>
                      patchRules({ body_min: ruleNumber(event.target.value) })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="template-body-max">
                    {t("template.bodyMax")}
                  </FieldLabel>
                  <Input
                    id="template-body-max"
                    type="number"
                    min={0}
                    value={form.output_rules.body_max || ""}
                    disabled={pending}
                    onChange={(event) =>
                      patchRules({ body_max: ruleNumber(event.target.value) })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="template-hashtag-min">
                    {t("template.hashtagMin")}
                  </FieldLabel>
                  <Input
                    id="template-hashtag-min"
                    type="number"
                    min={0}
                    value={form.output_rules.hashtag_min || ""}
                    disabled={pending}
                    onChange={(event) =>
                      patchRules({
                        hashtag_min: ruleNumber(event.target.value),
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="template-hashtag-max">
                    {t("template.hashtagMax")}
                  </FieldLabel>
                  <Input
                    id="template-hashtag-max"
                    type="number"
                    min={0}
                    value={form.output_rules.hashtag_max || ""}
                    disabled={pending}
                    onChange={(event) =>
                      patchRules({
                        hashtag_max: ruleNumber(event.target.value),
                      })
                    }
                  />
                </Field>
              </div>
              <p className="text-muted-foreground text-sm">
                {t("template.rulesEmptyHint")}
              </p>
            </Field>

            <Separator />

            <Field>
              <FieldLabel className="flex items-center gap-1">
                {t("template.samples")}
                <FieldInfoTip text={t("template.samplesTip")} />
              </FieldLabel>
              <div className="flex flex-col gap-3">
                {form.samples.map((sample, index) => (
                  <div
                    key={index}
                    className="border-border flex flex-col gap-2 rounded-md border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        className="flex-1"
                        placeholder={t("template.sampleTitlePlaceholder")}
                        value={sample.title}
                        disabled={pending}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            samples: prev.samples.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, title: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={t("template.removeSample")}
                        disabled={pending}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            samples: prev.samples.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <Textarea
                      className="min-h-32"
                      placeholder={t("template.sampleBodyPlaceholder")}
                      value={sample.body}
                      disabled={pending}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          samples: prev.samples.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, body: event.target.value }
                              : item,
                          ),
                        }))
                      }
                    />
                  </div>
                ))}
                {form.samples.length < CONTENT_TEMPLATE_SAMPLES_MAX ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        samples: [...prev.samples, { title: "", body: "" }],
                      }))
                    }
                  >
                    <Plus className="size-4" />
                    {t("template.addSample")}
                  </Button>
                ) : null}
              </div>
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
              {t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
