import { useState } from "react";

import {
  ApiError,
  FieldInfoTip,
  FileDropZone,
} from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Field, FieldError, FieldLabel } from "@rewindom/ui/field";
import { Textarea } from "@rewindom/ui/textarea";
import { toast } from "@rewindom/ui/toast";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useContentAssetObjectUrl } from "../hooks/useContentAssetObjectUrl.js";
import {
  useAddContentFileAsset,
  useAddContentTextAsset,
  useDeleteContentAsset,
} from "../hooks/useContentMutations.js";
import { CONTENT_UPLOAD_ACCEPT } from "../lib/contents.js";

import type { ContentAsset } from "../../shared/index.js";

interface ContentAssetsEditorProps {
  contentId: string;
  assets: ContentAsset[];
  disabled?: boolean;
  canWrite: boolean;
}

export function ContentAssetsEditor({
  contentId,
  assets,
  disabled,
  canWrite,
}: ContentAssetsEditorProps) {
  const { t } = useTranslation("content");
  const [extraText, setExtraText] = useState("");
  const [error, setError] = useState("");
  const uploadMutation = useAddContentFileAsset();
  const textMutation = useAddContentTextAsset();
  const deleteMutation = useDeleteContentAsset();
  const busy =
    disabled ||
    uploadMutation.isPending ||
    textMutation.isPending ||
    deleteMutation.isPending;

  const handleFiles = async (files: File[]): Promise<void> => {
    setError("");
    try {
      for (const file of files) {
        await uploadMutation.mutateAsync({ id: contentId, file });
      }
      toast.success(t("toastAssetAdded"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("assetFailed"));
    }
  };

  const handleAddText = async (): Promise<void> => {
    if (!extraText.trim()) return;
    setError("");
    try {
      await textMutation.mutateAsync({
        id: contentId,
        text_body: extraText,
      });
      setExtraText("");
      toast.success(t("toastAssetAdded"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("assetFailed"));
    }
  };

  const handleDelete = async (assetId: string): Promise<void> => {
    setError("");
    try {
      await deleteMutation.mutateAsync({ contentId, assetId });
      toast.success(t("toastAssetDeleted"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("assetFailed"));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <FieldLabel className="flex items-center gap-1">
        {t("fieldAssets")}
        <FieldInfoTip text={t("fieldAssetsTip")} />
      </FieldLabel>
      {assets.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("assetsEmpty")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {assets.map((asset) => (
            <li key={asset.id}>
              <ContentAssetCard
                contentId={contentId}
                asset={asset}
                canWrite={canWrite}
                disabled={busy}
                onDelete={() => void handleDelete(asset.id)}
              />
            </li>
          ))}
        </ul>
      )}
      {canWrite ? (
        <>
          <FileDropZone
            accept={CONTENT_UPLOAD_ACCEPT}
            multiple
            disabled={disabled}
            pending={uploadMutation.isPending}
            onFiles={(files) => void handleFiles(files)}
          />
          <Field>
            <FieldLabel htmlFor={`content-text-${contentId}`}>
              {t("addText")}
            </FieldLabel>
            <Textarea
              id={`content-text-${contentId}`}
              className="min-h-24"
              placeholder={t("textPlaceholder")}
              value={extraText}
              disabled={busy}
              onChange={(event) => setExtraText(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={busy || !extraText.trim()}
              onClick={() => void handleAddText()}
            >
              {t("addText")}
            </Button>
          </Field>
        </>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

interface ContentAssetCardProps {
  contentId: string;
  asset: ContentAsset;
  canWrite: boolean;
  disabled: boolean;
  onDelete: () => void;
}

function ContentAssetCard({
  contentId,
  asset,
  canWrite,
  disabled,
  onDelete,
}: ContentAssetCardProps) {
  const { t } = useTranslation("content");
  const objectUrl = useContentAssetObjectUrl(
    contentId,
    asset.kind === "text" ? null : asset.id,
    asset.kind !== "text",
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-medium">
          {asset.filename ||
            (asset.kind === "text" ? t("textAsset") : asset.kind)}
        </span>
        {canWrite ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled}
            aria-label={t("delete")}
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
      {asset.kind === "image" && objectUrl ? (
        <img
          src={objectUrl}
          alt={asset.filename}
          className="max-h-48 w-full rounded-md object-cover"
        />
      ) : null}
      {asset.kind === "video" && objectUrl ? (
        <video
          src={objectUrl}
          controls
          className="max-h-48 w-full rounded-md"
        />
      ) : null}
      {asset.kind === "text" ? (
        <p className="text-muted-foreground line-clamp-6 whitespace-pre-wrap text-sm">
          {asset.text_body}
        </p>
      ) : null}
    </div>
  );
}
