import { BrandMark } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { useRef, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

import type { BrandingAssetKind } from "../hooks/useTenantBrandingMutations.js";

export interface BrandingAssetCardProps {
  kind: BrandingAssetKind;
  url: string | null;
  canWrite: boolean;
  uploading: boolean;
  clearing: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
  accept: string;
  hint: string;
}

export function BrandingAssetCard({
  kind,
  url,
  canWrite,
  uploading,
  clearing,
  onUpload,
  onClear,
  accept,
  hint,
}: BrandingAssetCardProps) {
  const { t } = useTranslation("platform");
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = uploading || clearing;

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onUpload(file);
  }

  return (
    <section className="flex flex-col gap-4 rounded-md border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-medium">
          {t(`branding.${kind}.title`)}
        </h2>
        <p className="text-muted-foreground text-sm">{hint}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="bg-muted/40 flex size-16 items-center justify-center rounded-md border">
          {kind === "logo" ? (
            <BrandMark src={url} className="size-12" alt={t("branding.logo.title")} />
          ) : url ? (
            <img
              src={url}
              alt={t("branding.favicon.title")}
              className="size-10 object-contain"
            />
          ) : (
            <img
              src="/favicon.svg"
              alt={t("branding.favicon.title")}
              className="size-10 object-contain opacity-60"
            />
          )}
        </div>

        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? t("branding.uploading") : t("branding.upload")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy || !url}
              onClick={onClear}
            >
              {clearing ? t("branding.clearing") : t("branding.clear")}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
