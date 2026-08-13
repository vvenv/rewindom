import { type ReactElement } from "react";

import { Button } from "@rewindom/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rewindom/ui/dropdown-menu";
import { Input } from "@rewindom/ui/input";
import { useTranslation } from "react-i18next";

import { SITE_LINK_TARGET_GROUPS } from "../../../shared/site-link-target.js";
import { useSiteLinkTargets } from "../../hooks/useSiteLinkTargets.js";

/**
 * 「填一个链接」的统一控件：文本框 + 从站内选。
 *
 * 与 `SiteImageField` 同一个取舍——手填永远留着（外链、锚点、`mailto:` 都得能写），
 * 但站内地址不该逼租户自己去别处抄一遍 slug。候选按租户实时算，见
 * `server/site-link-target.service.ts`。
 */
export function SiteLinkField({
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
  // 只在打开下拉时才拉：填链接是低频动作，编辑器一打开就预取纯属浪费
  const { data: targets = [], refetch, isFetching } = useSiteLinkTargets();

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) void refetch();
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={disabled}>
            {t("editor.linkPick")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-auto">
          {targets.length === 0 ? (
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              {isFetching ? t("editor.linkLoading") : t("editor.linkEmpty")}
            </DropdownMenuLabel>
          ) : (
            SITE_LINK_TARGET_GROUPS.map((group, index) => {
              const items = targets.filter((item) => item.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  {index > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuLabel>
                    {t(`editor.linkGroup.${group}`)}
                  </DropdownMenuLabel>
                  {items.map((item) => (
                    <DropdownMenuItem
                      key={item.value}
                      onSelect={() => onChange(item.value)}
                      className="flex-col items-start gap-0"
                    >
                      <span className="truncate">
                        {item.label}
                        {item.draft ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {t("editor.linkDraft")}
                          </span>
                        ) : null}
                      </span>
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {item.value}
                        {item.hint ? ` · ${item.hint}` : ""}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
