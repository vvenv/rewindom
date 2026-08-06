import { type CSSProperties } from "react";

import { Input } from "@be-water/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@be-water/ui/popover";
import { Slider } from "@be-water/ui/slider";
import { cn } from "@be-water/ui/utils";
import { useTranslation } from "react-i18next";

import { composeSiteColor } from "../../shared/site-color.js";
import { resolveColorFieldParts } from "../lib/color-field.js";

/** 透明区域的棋盘格：8px 方格，深浅都用中性色，明暗主题下都看得出来。 */
const CHECKERBOARD = {
  backgroundImage:
    "linear-gradient(45deg, color-mix(in srgb, currentColor 18%, transparent) 25%, transparent 25%), linear-gradient(-45deg, color-mix(in srgb, currentColor 18%, transparent) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, color-mix(in srgb, currentColor 18%, transparent) 75%), linear-gradient(-45deg, transparent 75%, color-mix(in srgb, currentColor 18%, transparent) 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
} as const;

interface SiteColorFieldProps {
  id: string;
  /** 存储值，允许是用户敲到一半的非法文本。 */
  value: string;
  label: string;
  /** 关掉后只收 6 位不透明值（品牌主色这类）。 */
  allowAlpha?: boolean;
  /** 非法 / 空值时取色器落在哪个颜色上。 */
  fallback?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/**
 * 颜色字段：一行里放色块 + 十六进制输入框，**透明度收进色块弹出的取色面板**。
 *
 * 原来三处（页面设置 / 区块设置 / 品牌卡）各写了一份「色块 + 输入框 + 独立
 * alpha 滑杆」，每个颜色要占三行，右侧设置栏一屏放不下几个。透明度本来就是颜色
 * 的一部分，不该在表单里另起一行——但原生 `<input type="color">` 只认不透明
 * 六位，所以这里用弹层把「原生取色器 + 透明度」拼成一个控件。
 *
 * 色块底下垫棋盘格：半透明与纯色一眼能分出来，这是独立滑杆给不了的反馈。
 */
export function SiteColorField({
  id,
  value,
  label,
  allowAlpha = true,
  fallback,
  placeholder,
  disabled,
  onChange,
}: SiteColorFieldProps) {
  const { t } = useTranslation("marketing");
  const parts = resolveColorFieldParts(value, { fallback, allowAlpha });

  const setRgb = (rgb: string): void => {
    onChange(allowAlpha ? composeSiteColor(rgb, parts.alphaPercent) : rgb);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger
          disabled={disabled}
          aria-label={label}
          className={cn(
            // 尺寸 / 圆角 / 描边跟 `Input` 对齐（h-8 rounded-lg border-input），
            // 两个控件在同一行里高度与边框才连得上
            "relative size-8 shrink-0 overflow-hidden rounded-lg border border-input text-foreground transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            disabled
              ? "pointer-events-none cursor-not-allowed opacity-50"
              : "cursor-pointer",
          )}
        >
          <span aria-hidden className="absolute inset-0" style={CHECKERBOARD} />
          {parts.preview ? (
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ backgroundColor: parts.preview }}
            />
          ) : null}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 space-y-3">
          <Input
            type="color"
            aria-label={label}
            className="h-10 w-full cursor-pointer p-1"
            value={parts.swatch}
            onChange={(event) => setRgb(event.target.value)}
          />
          {allowAlpha ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("editor.opacity")}</span>
                <span className="tabular-nums">{parts.alphaPercent}%</span>
              </div>
              {/* 轨道本身就是一条透明→实色的渐变，拖到哪儿是什么效果不用猜 */}
              <Slider
                min={0}
                max={100}
                step={1}
                value={[parts.alphaPercent]}
                style={
                  {
                    "--alpha-track": `linear-gradient(to right, transparent, ${parts.swatch})`,
                  } as CSSProperties
                }
                className="[&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-track]]:h-2.5 [&_[data-slot=slider-track]]:[background-image:var(--alpha-track)]"
                onValueChange={([next]) =>
                  onChange(composeSiteColor(parts.swatch, next ?? 100))
                }
              />
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      <Input
        id={id}
        disabled={disabled}
        placeholder={placeholder ?? (allowAlpha ? "#00000000" : "#000000")}
        value={value}
        onChange={(event) => onChange(event.target.value.trim())}
      />
    </div>
  );
}
