import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";

import { FieldInfoTip } from "@be-water/client-kit";
import { Field, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@be-water/ui/tooltip";
import { cn } from "@be-water/ui/utils";
import { MoveHorizontal, MoveVertical, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  SECTION_PADDING_RANGE,
  SECTION_SPACING_RANGE,
  settingNumber,
  snapSettingNumber,
  type InputSettingDef,
  type SettingRange,
  type SettingValues,
} from "../../../shared/section-schema.js";

type SpacingBoxDef = Extract<InputSettingDef, { type: "spacing_box" }>;

interface SpacingBoxFieldProps {
  def: SpacingBoxDef;
  values: SettingValues;
  disabled?: boolean;
  onChange: (next: SettingValues) => void;
}

const HORIZONTAL_KEYS = ["padding_left", "padding_right"] as const;
const VERTICAL_KEYS = ["padding_top", "padding_bottom"] as const;

type PaddingKey =
  (typeof HORIZONTAL_KEYS)[number] | (typeof VERTICAL_KEYS)[number];
type SpacingKey = PaddingKey | "spacing_above" | "spacing_below";

/** 拖动多少像素走一档。太小会手抖跳档，太大拉满 120 要拖半个屏幕。 */
const PIXELS_PER_STEP = 3;
/** 超过这个位移才算拖动；之内当点击（聚焦并全选，方便直接改写）。 */
const DRAG_THRESHOLD = 3;
/** 按住 Shift 的粗调倍率（padding 即 16px 一跳）。 */
const COARSE_MULTIPLIER = 4;

/**
 * 版式盒模型：外圈上下 = 段间距（可继承），内圈四边 = 段内留白。
 * 不做左右外间距（通栏色块不该被 margin 缩进视口）。
 *
 * 每个格子都是「可拖的数字」：拖动 / 方向键连续调，输入框只在真要打字时才用到。
 * 光标停在哪一格，盒子对应的那条边就点亮——300px 的侧栏里六个小框长得一样，
 * 不指出来根本认不出自己在改哪条边。中间两个开关按轴联锁对边（见 `LockToggle`）。
 *
 * 字段说明与操作提示都收在标签后的气泡里（`FieldInfoTip`），不在控件下面压灰字。
 */
export function SpacingBoxField({
  def,
  values,
  disabled,
  onChange,
}: SpacingBoxFieldProps): ReactElement {
  const { t } = useTranslation("marketing");
  /*
   * 联锁：两个轴各一个开关，四种组合正好是「不锁 / 锁水平 / 锁垂直 / 锁全部」。
   * 做成两个 toggle 而不是一颗四态循环按钮——循环得点三下才回得来，也看不出当前是哪档。
   * 纯编辑器态，不落库（下次打开回到各边独立）。
   */
  const [lockX, setLockX] = useState(false);
  const [lockY, setLockY] = useState(false);
  const [active, setActive] = useState<SpacingKey | null>(null);

  const paddingTop = settingNumber(
    values,
    "padding_top",
    def.padding?.top ?? 0,
  );
  const paddingRight = settingNumber(
    values,
    "padding_right",
    def.padding?.right ?? 0,
  );
  const paddingBottom = settingNumber(
    values,
    "padding_bottom",
    def.padding?.bottom ?? 0,
  );
  const paddingLeft = settingNumber(
    values,
    "padding_left",
    def.padding?.left ?? 0,
  );
  const spacingAbove = settingNumber(
    values,
    "spacing_above",
    def.spacing?.above ?? -4,
  );
  const spacingBelow = settingNumber(
    values,
    "spacing_below",
    def.spacing?.below ?? -4,
  );

  const setPadding = (key: PaddingKey, next: number): void => {
    // 只锁同一条轴上的对边：锁水平时改左边跟着改右边，上下仍各管各的
    const horizontal = key === "padding_left" || key === "padding_right";
    const locked = horizontal ? lockX : lockY;
    const keys: readonly PaddingKey[] = !locked
      ? [key]
      : horizontal
        ? HORIZONTAL_KEYS
        : VERTICAL_KEYS;
    const merged = { ...values };
    for (const paddingKey of keys) merged[paddingKey] = next;
    onChange(merged);
  };

  const setSpacing = (
    key: "spacing_above" | "spacing_below",
    next: number,
  ): void => {
    onChange({ ...values, [key]: next });
  };

  /* 离开 A 的事件可能晚于进入 B，直接置空会把 B 的高亮抹掉 */
  const activate = (key: SpacingKey, on: boolean): void => {
    setActive((current) => (on ? key : current === key ? null : current));
  };

  const cellProps = (key: SpacingKey) => ({
    disabled,
    onActiveChange: (on: boolean) => activate(key, on),
  });

  /* 字段说明 + 怎么操作，合成一段收进标签后的气泡：六个格子各挂一个 title
     会在拖动时不停弹，说明放一处就够 */
  const infoText = [def.info ? t(def.info) : "", t("editor.spacingBoxHint")]
    .filter(Boolean)
    .join("\n");

  return (
    <Field>
      <FieldLabel className="flex items-center gap-1">
        {t(def.label)}
        <FieldInfoTip text={infoText} side="left" />
      </FieldLabel>
      <div
        className={cn(
          "rounded-lg border border-dashed border-muted-foreground/30 bg-muted/40 p-2 transition-colors",
          active === "spacing_above" && "border-t-primary",
          active === "spacing_below" && "border-b-primary",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex flex-col items-center gap-1.5">
          <BoxCell
            label={t("editor.setting.spacing_above")}
            axis="y"
            value={spacingAbove}
            inherit
            onCommit={(next) => setSpacing("spacing_above", next)}
            {...cellProps("spacing_above")}
          />
          <div
            className={cn(
              "grid w-full grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-center gap-1.5",
              "rounded-md border border-border bg-background p-1.5 transition-colors",
              active === "padding_top" && "border-t-primary",
              active === "padding_right" && "border-r-primary",
              active === "padding_bottom" && "border-b-primary",
              active === "padding_left" && "border-l-primary",
            )}
          >
            <BoxCell
              label={t("editor.setting.padding_left")}
              axis="x"
              value={paddingLeft}
              onCommit={(next) => setPadding("padding_left", next)}
              {...cellProps("padding_left")}
            />
            <div className="flex flex-col items-center gap-1.5 py-1">
              <BoxCell
                label={t("editor.setting.padding_top")}
                axis="y"
                value={paddingTop}
                onCommit={(next) => setPadding("padding_top", next)}
                {...cellProps("padding_top")}
              />
              <div className="flex h-9 w-full items-center justify-center gap-1 rounded border border-dashed border-muted-foreground/25 px-1">
                <LockToggle
                  label={t("editor.spacingBoxLockX")}
                  icon={MoveHorizontal}
                  pressed={lockX}
                  disabled={disabled}
                  onToggle={() => setLockX((current) => !current)}
                />
                <LockToggle
                  label={t("editor.spacingBoxLockY")}
                  icon={MoveVertical}
                  pressed={lockY}
                  disabled={disabled}
                  onToggle={() => setLockY((current) => !current)}
                />
              </div>
              <BoxCell
                label={t("editor.setting.padding_bottom")}
                axis="y"
                value={paddingBottom}
                onCommit={(next) => setPadding("padding_bottom", next)}
                {...cellProps("padding_bottom")}
              />
            </div>
            <BoxCell
              label={t("editor.setting.padding_right")}
              axis="x"
              value={paddingRight}
              onCommit={(next) => setPadding("padding_right", next)}
              {...cellProps("padding_right")}
            />
          </div>
          <BoxCell
            label={t("editor.setting.spacing_below")}
            axis="y"
            value={spacingBelow}
            inherit
            onCommit={(next) => setSpacing("spacing_below", next)}
            {...cellProps("spacing_below")}
          />
        </div>
      </div>
    </Field>
  );
}

/**
 * 一条轴的联锁开关（水平 / 垂直各一个）。
 *
 * 按下后这条轴上的两边一起改；两个都按下就是「锁全部」，都不按就是「不锁」。
 * 图标用 ↔ / ↕ 而不是链条：链条只说明「锁上了」，说不清锁的是哪条轴。
 * 纯图标按钮，名字只在 `aria-label` 里，所以挂 tooltip 让鼠标也读得到。
 */
function LockToggle({
  label,
  icon: Icon,
  pressed,
  disabled,
  onToggle,
}: {
  label: string;
  icon: LucideIcon;
  pressed: boolean;
  disabled?: boolean;
  onToggle: () => void;
}): ReactElement {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-pressed={pressed}
            aria-label={label}
            className={cn(
              "rounded p-1 transition-colors hover:text-foreground",
              pressed
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground/70 hover:bg-muted",
            )}
            onClick={onToggle}
          >
            <Icon className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface BoxCellProps {
  label: string;
  /** 该格子沿哪个方向拖：左右两边用横向，上下四格用纵向。 */
  axis: "x" | "y";
  value: number;
  /** 可继承的格子：负值 = 继承主题「区块间距」，显示成占位文字。 */
  inherit?: boolean;
  disabled?: boolean;
  onCommit: (next: number) => void;
  onActiveChange: (active: boolean) => void;
}

interface DragState {
  pointerId: number;
  origin: number;
  start: number;
  moved: boolean;
}

/**
 * 一格数字。三种改法：拖（连续）、方向键（一档 / Shift 四档）、直接打字。
 *
 * 打字期间值只存在本地草稿里，失焦或回车才吸附提交——原来每敲一个字符就 clamp
 * 一次，想输「12」会在敲下「1」时被吸成 0，根本打不进两位数。
 */
function BoxCell({
  label,
  axis,
  value,
  inherit = false,
  disabled,
  onCommit,
  onActiveChange,
}: BoxCellProps): ReactElement {
  const { t } = useTranslation("marketing");
  const range: SettingRange = inherit
    ? SECTION_SPACING_RANGE
    : SECTION_PADDING_RANGE;
  const inherited = inherit && value < 0;

  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const hoverRef = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const commitDraft = (): void => {
    const raw = draft?.trim() ?? null;
    setDraft(null);
    if (raw === null) return;
    // 清空 = 回到档位下限：留白归 0，段间距回「继承」
    if (raw === "") {
      onCommit(range.min);
      return;
    }
    const num = Number(raw);
    // 输了非数字就当没改过（setDraft(null) 已经把显示复原）
    if (!Number.isFinite(num)) return;
    onCommit(snapSettingNumber(num, range));
  };

  const stepBy = (steps: number): void => {
    // 空草稿按「没输」算：Number("") 是 0，会让清空后按 ↑ 从 0 起跳而不是从下限
    const typed = draft?.trim() ? Number(draft.trim()) : Number.NaN;
    // 「继承」就是档位下限，往上一档落到 0、往下一档还是「继承」
    const base = Number.isFinite(typed) ? typed : inherited ? range.min : value;
    setDraft(null);
    onCommit(snapSettingNumber(base + steps * range.step, range));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const direction = event.key === "ArrowUp" ? 1 : -1;
      stepBy(direction * (event.shiftKey ? COARSE_MULTIPLIER : 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
      inputRef.current?.select();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(null);
    }
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLInputElement>,
  ): void => {
    if (disabled || event.button !== 0) return;
    /*
     * 拦掉默认的按下取词：拖动时不希望顺手把输入框里的字选中。
     * 聚焦改到 pointerup 手动做——没拖动才聚焦，且顺手全选。
     */
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      origin: axis === "x" ? event.clientX : event.clientY,
      start: inherited ? range.min : value,
      moved: false,
    };
    // 可选调用：拖动本身不依赖捕获，环境不支持时（测试用的 DOM 实现）也别炸
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLInputElement>,
  ): void => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    // 统一「向上 / 向右为加」，跟方向键一致；按边的朝向走反而会和 ArrowUp 打架
    const delta =
      axis === "x" ? event.clientX - drag.origin : drag.origin - event.clientY;
    if (!drag.moved) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      drag.moved = true;
      setDraft(null);
      setDragging(true);
    }
    // 每次都从起始值重算，避免逐帧累加把误差滚大
    const steps = Math.round(delta / PIXELS_PER_STEP);
    onCommit(snapSettingNumber(drag.start + steps * range.step, range));
  };

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLInputElement>,
  ): void => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
    // 拖完也留焦点，好接着用方向键微调；只有点击才顺手全选（准备改写）
    inputRef.current?.focus();
    if (!drag.moved) inputRef.current?.select();
  };

  const display = draft ?? (inherited ? "" : String(value));

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      // 读屏把它当步进器读，值 / 上下限 / 「继承」都能报出来
      role="spinbutton"
      aria-valuenow={inherited ? undefined : value}
      aria-valuemin={inherit ? 0 : range.min}
      aria-valuemax={range.max}
      aria-valuetext={inherited ? t("editor.inherit") : `${value}px`}
      disabled={disabled}
      className={cn(
        "h-7 w-14 touch-none px-1 text-center text-xs tabular-nums",
        axis === "x" ? "cursor-ew-resize" : "cursor-ns-resize",
        "focus:cursor-text",
        dragging && "border-ring",
      )}
      value={display}
      placeholder={inherit ? t("editor.inherit") : String(range.min)}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={() => onActiveChange(true)}
      onBlur={() => {
        commitDraft();
        if (!hoverRef.current) onActiveChange(false);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={() => {
        hoverRef.current = true;
        onActiveChange(true);
      }}
      onPointerLeave={() => {
        hoverRef.current = false;
        if (!dragging && document.activeElement !== inputRef.current) {
          onActiveChange(false);
        }
      }}
    />
  );
}
