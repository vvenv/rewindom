import { useRef, type ChangeEvent } from "react";

import { Button } from "@be-water/ui/button";
import { cn } from "@be-water/ui/utils";
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
        {/*
          未上传就画一个空槽，**不**拿产品默认图充数。
          这里原先渲染 `BrandMark` / `/favicon.svg` 的兜底，与「已上传」长得一模一样，
          于是品牌页显示着 logo、官网页头却是空的（那边没有兜底，见
          `sections/header/html.ts`）——同一个状态两处相反，租户只能当成 bug。
          产品默认图是应用外壳自己的事，放在这张「租户上传了什么」的卡片里没有意义。
        */}
        <div
          className={cn(
            "bg-muted/40 flex size-16 items-center justify-center rounded-md border p-1",
            url ? undefined : "border-dashed",
          )}
        >
          {url ? (
            <img
              src={url}
              alt={t(`branding.${kind}.title`)}
              className="size-full object-contain"
            />
          ) : (
            <span className="text-muted-foreground text-center text-xs leading-tight">
              {t("branding.unset")}
            </span>
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
            {/* 没上传过就没有「清除」可言：留一枚永远灰着的按钮只是噪音 */}
            {url ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={onClear}
              >
                {clearing ? t("branding.clearing") : t("branding.clear")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
