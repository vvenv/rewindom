import {
  ApiError,
  FieldInfoTip,
  PageLayout,
  usePermissions,
} from "@rewindom/module-sdk/client";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { Spinner } from "@rewindom/ui/spinner";
import { Textarea } from "@rewindom/ui/textarea";
import { ArrowLeft, PenLine, Sparkles, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ContentAssetsEditor } from "../components/ContentAssetsEditor.js";
import { ContentFormatField } from "../components/ContentFormatField.js";
import { ContentStatusBadge } from "../components/ContentStatusBadge.js";
import { useContentDetailPage } from "../hooks/useContentDetailPage.js";
import { displayContentTitle, translateContentError } from "../lib/contents.js";

export function ContentDetail() {
  const { t } = useTranslation("content");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("contents.write");
  const page = useContentDetailPage();

  if (page.isLoading && !page.data) {
    return (
      <PageLayout
        icon={PenLine}
        title={t("title")}
        description={t("detailDescription")}
      >
        <div className="flex justify-center py-12">
          <Spinner className="size-6" />
        </div>
      </PageLayout>
    );
  }

  if (page.isError || !page.data) {
    return (
      <PageLayout
        icon={PenLine}
        title={t("title")}
        description={t("detailDescription")}
      >
        <Alert>
          <AlertDescription>
            {page.error instanceof ApiError
              ? page.error.message
              : t("loadFailed")}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => void page.refetch()}>
          {t("retry")}
        </Button>
      </PageLayout>
    );
  }

  const errorText = translateContentError(page.data.error_message, t);

  return (
    <PageLayout
      icon={PenLine}
      title={displayContentTitle(page.data.title, t)}
      description={t("detailDescription")}
      action={
        canWrite ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={page.busy}
              onClick={() => void page.handleGenerate()}
            >
              {page.generating ? (
                <Spinner className="size-4" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {page.generating
                ? t("generating")
                : page.data.status === "draft"
                  ? t("generate")
                  : t("regenerate")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page.busy}
              onClick={() => void page.handleDelete()}
            >
              <Trash2 className="size-4" />
              <span className="hidden md:inline">{t("delete")}</span>
            </Button>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/contents">
              <ArrowLeft className="size-4" />
              {t("backToList")}
            </Link>
          </Button>
          <ContentStatusBadge status={page.data.status} />
          {page.data.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {page.data.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {page.generating ? (
          <Alert>
            <AlertDescription>{t("generating")}</AlertDescription>
          </Alert>
        ) : null}
        {errorText && page.data.status === "failed" ? (
          <Alert>
            <AlertDescription>{errorText}</AlertDescription>
          </Alert>
        ) : null}

        <ContentAssetsEditor
          contentId={page.data.id}
          assets={page.data.assets}
          canWrite={canWrite}
          disabled={page.busy}
        />

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => void page.handleSave(event)}
        >
          <FieldGroup>
            <ContentFormatField
              id="content-detail-format"
              value={page.form.format}
              disabled={!canWrite || page.busy}
              onChange={(format) =>
                page.setForm((prev) => ({ ...prev, format }))
              }
            />
            <Field>
              <FieldLabel htmlFor="content-detail-title">
                {t("fieldTitle")}
              </FieldLabel>
              <Input
                id="content-detail-title"
                value={page.form.title}
                disabled={!canWrite || page.busy}
                onChange={(event) =>
                  page.setForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel
                htmlFor="content-detail-brief"
                className="flex items-center gap-1"
              >
                {t("fieldBrief")}
                <FieldInfoTip text={t("fieldBriefTip")} />
              </FieldLabel>
              <Textarea
                id="content-detail-brief"
                className="min-h-32"
                value={page.form.brief}
                disabled={!canWrite || page.busy}
                onChange={(event) =>
                  page.setForm((prev) => ({
                    ...prev,
                    brief: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="content-detail-body">
                {t("fieldBody")}
              </FieldLabel>
              <Textarea
                id="content-detail-body"
                className="min-h-64"
                value={page.form.body}
                disabled={!canWrite || page.busy}
                onChange={(event) =>
                  page.setForm((prev) => ({
                    ...prev,
                    body: event.target.value,
                  }))
                }
              />
            </Field>
            {page.formError ? <FieldError>{page.formError}</FieldError> : null}
          </FieldGroup>
          {canWrite ? (
            <div className="flex justify-end">
              <Button type="submit" disabled={page.busy}>
                {page.isSaving ? <Spinner className="size-4" /> : null}
                {t("save")}
              </Button>
            </div>
          ) : null}
        </form>
        <p className="text-muted-foreground text-sm">{t("llmHint")}</p>
      </div>
    </PageLayout>
  );
}
