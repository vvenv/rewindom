import type { ReactElement } from "react";

import { Button } from "@be-water/ui/button";
import { Input } from "@be-water/ui/input";
import { useTranslation } from "react-i18next";

import { MediaPickerDialog } from "./MediaPickerDialog.js";


/**
 * 「填一个图片 URL」的统一控件：文本框 + 选图 + 预览。
 *
 * 凡是吃图片地址的字段都该用它（logo、分享图、section 的 `image` 设置）。留一个裸
 * `<Input>` 在那儿，等于让租户自己去别处复制 URL 再粘回来——媒体库就白建了。
 *
 * 仍然保留手填：外链图（CDN 上的图）不该被强制先传进媒体库。
 */
export function SiteImageField({
  id,
  value,
  disabled,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (next: string) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          id={id}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {/*
          「选图」而不是「上传」：同一张图在多处用是常态，每次都重新上传只会让媒体库
          堆出一堆一模一样的文件。弹层里照样能就地上传。
        */}
        <MediaPickerDialog onSelect={(asset) => onChange(asset.url)}>
          <Button type="button" variant="outline" size="sm" disabled={disabled}>
            {t("media.pick")}
          </Button>
        </MediaPickerDialog>
      </div>
      {value ? (
        <img
          src={value}
          alt=""
          className="max-h-24 w-auto rounded-md border border-border/60 object-contain"
        />
      ) : null}
    </div>
  );
}
