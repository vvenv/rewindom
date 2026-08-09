import { useRef, useState, type ReactElement, type ReactNode } from "react";

import { EmptyState } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@be-water/ui/dialog";
import { Spinner } from "@be-water/ui/spinner";
import { toast } from "@be-water/ui/toast";
import { ImageOff, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useSiteAssets,
  useUploadSiteAsset,
  type SiteAsset,
} from "../../hooks/useSiteAssets.js";

const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml";

/**
 * 从媒体库选一张图（也能就地上传）。
 *
 * 存在的理由是**复用**：以前每个 `image` 字段都只有「上传」一条路，同一张图在五个段里
 * 用就上传五份，谁也说不清哪个 URL 还有人在用。
 *
 * 列表只在弹层打开后才拉（`enabled`）——编辑器里 `image` 字段可能有十几个，
 * 每个都预拉一次媒体库是纯浪费。
 */
export function MediaPickerDialog({
  children,
  onSelect,
}: {
  children: ReactNode;
  onSelect: (asset: SiteAsset) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useSiteAssets(open);
  const upload = useUploadSiteAsset();

  const pick = (asset: SiteAsset): void => {
    onSelect(asset);
    setOpen(false);
  };

  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      // 上传完直接选中：这一步几乎总是「传了就是要用它」
      pick(await upload.mutateAsync(file));
      toast.success(t("editor.toastImageUploaded"));
    } catch {
      toast.error(t("editor.toastImageUploadFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("media.pickTitle")}</DialogTitle>
          <DialogDescription>{t("media.pickHint")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-5" />
            </div>
          ) : (data?.length ?? 0) === 0 ? (
            <EmptyState
              size="panel"
              icon={ImageOff}
              title={t("media.empty")}
              description={t("media.emptyHint")}
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {data?.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    className="w-full overflow-hidden rounded-md border border-border/60 hover:border-primary"
                    onClick={() => pick(asset)}
                  >
                    <img
                      src={asset.url}
                      alt={asset.alt}
                      className="aspect-square w-full bg-muted object-contain"
                    />
                    {asset.width > 0 ? (
                      <span className="block px-1 py-1 text-[10px] text-muted-foreground tabular-nums">
                        {asset.width} × {asset.height}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4">
          <Button
            type="button"
            variant="outline"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? (
              <Spinner className="size-4" />
            ) : (
              <Upload className="size-4" />
            )}
            {t("editor.uploadImage")}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void onFile(file);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
