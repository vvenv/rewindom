import { useCallback, useState, type ReactElement } from "react";

import { EmptyState, useConfirm } from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import { Input } from "@rewindom/ui/input";
import { Skeleton } from "@rewindom/ui/skeleton";
import { toast } from "@rewindom/ui/toast";
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
    <li className="group flex min-w-0 flex-col gap-2 overflow-hidden rounded-lg border border-border/60 p-2">
      <div className="relative overflow-hidden rounded-md bg-muted">
        <img
          src={asset.url}
          alt={asset.alt}
          className="aspect-video w-full object-contain"
        />
        <p className="pointer-events-none absolute bottom-1.5 left-1.5 max-w-[calc(100%-0.75rem)] truncate rounded-md bg-background/85 px-1.5 py-0.5 text-[11px] text-muted-foreground tabular-nums shadow-sm backdrop-blur-sm">
          {asset.width > 0 ? `${asset.width} × ${asset.height} · ` : ""}
          {formatSize(asset.size_bytes)}
        </p>
        <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <Button
            variant="secondary"
            size="icon-sm"
            className="bg-background/90 shadow-sm backdrop-blur-sm"
            aria-label={t("media.copyUrl")}
            onClick={() => {
              void navigator.clipboard.writeText(asset.url);
              toast.success(t("media.urlCopied"));
            }}
          >
            <Copy />
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            className="bg-background/90 text-destructive shadow-sm backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive"
            aria-label={t("media.delete")}
            disabled={remove.isPending}
            onClick={() => void handleDelete()}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <Input
        value={alt}
        placeholder={t("media.altPlaceholder")}
        aria-label={t("media.alt")}
        onChange={(event) => setAlt(event.target.value)}
        onBlur={() => void saveAlt()}
      />
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
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <li
            key={index}
            className="flex flex-col gap-2 rounded-lg border border-border/60 p-2"
          >
            <Skeleton className="aspect-video w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-lg" />
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
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {assets.map((asset) => (
        <MediaCard key={asset.id} asset={asset} />
      ))}
    </ul>
  );
}
