import { Label } from "@be-water/ui/label";
import { RadioGroup, RadioGroupItem } from "@be-water/ui/radio-group";

/** RadioGroup 的值只能是字符串，用空串表示「继承 / 跟随上一级」。 */
export const INHERIT_VALUE = "";

interface AppearanceOption {
  slug: string;
  label: string;
  description: string;
}

/**
 * 外观选项（主题 / 布局）的单选组。平台设置页与租户外观面板共用：
 * 前者不给「继承」选项（它自己就是最上一级），后者给。
 */
export function AppearanceOptionGroup({
  idPrefix,
  value,
  options,
  onChange,
  disabled = false,
  inherit,
}: {
  idPrefix: string;
  value: string;
  options: readonly AppearanceOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  /** 传入即渲染「继承平台默认」一项；`description` 用来说明当前继承到什么。 */
  inherit?: { label: string; description: string };
}) {
  const rows = [
    ...(inherit
      ? [
          {
            slug: INHERIT_VALUE,
            label: inherit.label,
            description: inherit.description,
          },
        ]
      : []),
    ...options,
  ];

  return (
    <RadioGroup value={value} onValueChange={onChange} disabled={disabled}>
      {rows.map((row) => {
        const id = `${idPrefix}-${row.slug || "inherit"}`;
        return (
          <div
            key={id}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            <RadioGroupItem value={row.slug} id={id} className="mt-0.5" />
            <Label
              htmlFor={id}
              className="flex flex-col items-start gap-1 font-normal"
            >
              <span className="text-sm font-medium">{row.label}</span>
              <span className="text-sm text-muted-foreground">
                {row.description}
              </span>
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}
