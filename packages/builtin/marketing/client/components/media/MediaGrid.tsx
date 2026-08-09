import { useCallback, useState, type ReactElement } from "react";

import { EmptyState, useConfirm } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { Input } from "@be-water/ui/input";
import { Skeleton } from "@be-water/ui/skeleton";
import { toast } from "@be-water/ui/toast";
import { Copy, ImageOff, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useDeleteSiteAsset,
  useUpdateSiteAssetAlt,
  type SiteAsset,
} from "../../hooks/useSiteAssets.js";

/** 字节 → 人读得懂的大小；媒体库里只需要一位小数。 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function MediaCard({ asset }: { asset: SiteAsset }): ReactElement {
  const { t } = useTranslation("marketing");
  const { confirm } = useConfirm();
  const [alt, setAlt] = useState(asset.alt);
  const updateAlt = useUpdateSiteAssetAlt();
  const remove = useDeleteSiteAsset();

  const saveAlt = useCallback(async () => {
    if (alt === asset.alt) return;
    try {
      await updateAlt.mutateAsync({ id: asset.id, alt });
      toast.success(t("media.altSaved"));
    } catch {
      toast.error(t("media.altSaveFailed"));
      setAlt(asset.alt);
    }
  }, [alt, asset, updateAlt, t]);

  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: t("media.deleteConfirmTitle"),
      // 引用检查做不可靠（引用散在 section JSON 与富文本里），所以话说在前面
      description: t("media.deleteConfirmDescription"),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(asset.id);
      toast.success(t("media.deleted"));
    } catch {
      toast.error(t("media.deleteFailed"));
    }
  }, [asset, confirm, remove, t]);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border/60 p-3">
      <img
        src={asset.url}
        alt={asset.alt}
        className="aspect-video w-full rounded-md bg-muted object-contain"
      />
      <p className="text-xs text-muted-foreground tabular-nums">
        {asset.width > 0 ? `${asset.width} × ${asset.height} · ` : ""}
        {formatSize(asset.size_bytes)}
      </p>
      <Input
        value={alt}
        placeholder={t("media.altPlaceholder")}
        aria-label={t("media.alt")}
        onChange={(event) => setAlt(event.target.value)}
        onBlur={() => void saveAlt()}
      />
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("media.copyUrl")}
          onClick={() => {
            void navigator.clipboard.writeText(asset.url);
            toast.success(t("media.urlCopied"));
          }}
        >
          <Copy className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("media.delete")}
          disabled={remove.isPending}
          onClick={() => void handleDelete()}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}

export function MediaGrid({
  assets,
  isLoading,
}: {
  assets: SiteAsset[];
  isLoading: boolean;
}): ReactElement {
  const { t } = useTranslation("marketing");

  if (isLoading && assets.length === 0) {
    return (
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index}>
            <Skeleton className="aspect-video w-full rounded-lg" />
          </li>
        ))}
      </ul>
    );
  }

  if (assets.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title={t("media.empty")}
        description={t("media.emptyHint")}
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {assets.map((asset) => (
        <MediaCard key={asset.id} asset={asset} />
      ))}
    </ul>
  );
}
