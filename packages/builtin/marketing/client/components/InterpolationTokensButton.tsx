/**
 * 「可用占位符」—— 租户看得见的那份 `{token}` 清单。
 *
 * 以前占位符只以**一行字段提示**存在：`渲染时替换：{year} {site} {tagline} …`。
 * 那行字回答不了唯一要紧的问题——`{topic_slug}` 到底是什么、`{site}` 现在等于什么、
 * 这张页面上到底有没有 `{event}`。租户只能靠猜，猜错了就在前台留下一个花括号。
 *
 * 所以清单从「一行字」升级成一个面板：一个 token 一行，带**说明**，站点级的还直接
 * 显示**当前值**（`{site} → Acme`）——这是「它会变成什么」最短的解释。点一行即复制。
 *
 * 内容全部来自注册表（`shared/interpolation-tokens.ts`），按当前页面 kind 与本站
 * 已开通能力过滤：没开通店面就不会列出 `{product}`，普通页面不会列出 `{event}`。
 * 手写清单必然与实际能替的东西漂移，那正是这个注册表存在的原因。
 */

import { useMemo, useState, type ReactElement } from "react";

import { Button } from "@rewindom/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rewindom/ui/popover";
import { Braces } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  interpolationTokensFor,
  type InterpolationTokenDefinition,
} from "../../shared/interpolation-tokens.js";

export interface InterpolationTokensButtonProps {
  /** 当前页面的 kind；页头 / 页脚这类站点级区域不传（那里只有全站通用的那几个）。 */
  pageKind?: string;
  /** 本站已开通的能力；不传等于一个贡献 token 都不列。 */
  entitlements?: ReadonlySet<string>;
  /**
   * 站点名称与标语，用来显示「当前值」。
   *
   * 不传就只列说明——**不要**在这里回落成假数据：清单的价值全在于它说的就是访客
   * 会看到的那个值。
   */
  site?: { site_name: string; tagline: string };
}

/** 站点级 token 的当前值。按页取值的（`{event}` 等）在编辑器里无从算起，只给说明。 */
function siteWideValues(
  site: InterpolationTokensButtonProps["site"],
): Record<string, string> {
  const values: Record<string, string> = {
    year: String(new Date().getFullYear()),
  };
  if (typeof window !== "undefined") {
    values.hostname = window.location.hostname;
    values.url = window.location.origin;
  }
  if (site) {
    values.site = site.site_name;
    values.tagline = site.tagline;
  }
  return values;
}

function TokenRow({
  token,
  value,
  onCopy,
}: {
  token: InterpolationTokenDefinition;
  /** 站点级 token 的当前值；按页取值的不传（编辑器里无从算起）。空串是**有效值**。 */
  value?: string;
  onCopy: (key: string) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  return (
    <li>
      <button
        type="button"
        className="flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-muted"
        onClick={() => onCopy(token.key)}
      >
        <span className="flex items-baseline gap-2">
          <code className="shrink-0 font-mono text-xs">{`{${token.key}}`}</code>
          {value === undefined ? null : (
            /* 当前值可能很长（标语、站点地址），截断而不是把面板撑宽 */
            <span className="truncate text-xs text-muted-foreground">
              {/*
                空串照样要说出来：标语没填时这个占位符会渲染成空，
                「什么都不显示」会被当成「这一行还没加载出来」。
              */}
              → {value === "" ? t("editor.token.empty") : value}
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">{t(token.label)}</span>
      </button>
    </li>
  );
}

export function InterpolationTokensButton({
  pageKind,
  entitlements,
  site,
}: InterpolationTokensButtonProps): ReactElement | null {
  const { t } = useTranslation("marketing");
  const [open, setOpen] = useState(false);

  const tokens = useMemo(
    () => interpolationTokensFor({ pageKind, entitlements }),
    [pageKind, entitlements],
  );
  const values = useMemo(() => siteWideValues(site), [site]);

  if (tokens.length === 0) return null;

  const sitewide = tokens.filter((token) => !token.page_kinds);
  const pageScoped = tokens.filter((token) => token.page_kinds);

  const copy = (key: string): void => {
    const text = `{${key}}`;
    void navigator.clipboard?.writeText(text);
    toast.success(t("editor.token.copied"), { description: text });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto gap-1 px-1.5 py-1 text-xs font-normal text-muted-foreground"
        >
          <Braces className="size-3.5" aria-hidden />
          {t("editor.token.title")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <p className="px-2 pt-1 pb-2 text-xs text-muted-foreground">
          {t("editor.token.hint")}
        </p>
        {/*
          只有一组时不画分组抬头：普通页面本来就只有全站通用那几个，
          给一条独苗加一个「本站通用」的帽子只是噪音。
        */}
        <TokenGroup
          label={pageScoped.length > 0 ? t("editor.token.sitewide") : undefined}
          tokens={sitewide}
          values={values}
          onCopy={copy}
        />
        <TokenGroup
          label={t("editor.token.thisPage")}
          tokens={pageScoped}
          onCopy={copy}
        />
      </PopoverContent>
    </Popover>
  );
}

function TokenGroup({
  label,
  tokens,
  values,
  onCopy,
}: {
  label?: string;
  tokens: readonly InterpolationTokenDefinition[];
  values?: Record<string, string>;
  onCopy: (key: string) => void;
}): ReactElement | null {
  if (tokens.length === 0) return null;
  return (
    <>
      {label ? (
        <p className="px-2 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
      ) : null}
      <ul>
        {tokens.map((token) => (
          <TokenRow
            key={token.key}
            token={token}
            value={values?.[token.key]}
            onCopy={onCopy}
          />
        ))}
      </ul>
    </>
  );
}
