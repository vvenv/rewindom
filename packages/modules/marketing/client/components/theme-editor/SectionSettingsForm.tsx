import { type ReactElement } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@be-water/ui/tabs";
import { cn } from "@be-water/ui/utils";
import { LayoutTemplate, Palette, Type, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  getBlockDefinition,
  getSectionDefinition,
  splitSettingsByScope,
  type SettingDef,
  type SettingValues,
  type SiteSection,
} from "../../../shared/section-schema.js";

import { SettingsFields } from "./SettingsFields.js";

import type { AppLocale } from "@be-water/shared";

interface SectionSettingsFormProps {
  section: SiteSection;
  /** 选中 block 时编辑该 block；否则编辑 section 自身 settings。 */
  blockId?: string | null;
  disabled?: boolean;
  /** 本站还不具备的能力：setting id → 说明（字段照常显示但点不动）。 */
  unavailable?: Record<string, string>;
  /** 正在编辑的语言（文案类字段按语言分槽存）。 */
  locale: AppLocale;
  defaultLocale: AppLocale;
  onChangeSettings: (settings: SettingValues) => void;
  onChangeBlockSettings: (blockId: string, settings: SettingValues) => void;
}

/**
 * 一组设置里有没有**真的能填的东西**。
 *
 * 抬头（`header`）只是分组标题，自己不可配置：只剩抬头的一组等于空组，
 * 拿它开个页签会得到一个点进去什么都没有的空面板。
 */
function hasFields(defs: SettingDef[]): boolean {
  return defs.some((def) => def.type !== "header" && def.type !== "paragraph");
}

interface SettingsTab {
  value: "content" | "layout" | "appearance";
  labelKey: string;
  icon: LucideIcon;
  defs: SettingDef[];
}

/**
 * 右侧设置面板：完全由 section-schema 驱动，不再按 type 手写表单。
 *
 * 内容 / 版式 / 外观分页签——外观（底色预设、色、边、圆角）与版式（留白、宽度）分开，
 * 窄侧栏里未激活页签只显示图标、激活页签才展开文字。
 * 只有一组有字段时不套页签；全都空则只留一句提示。
 */
export function SectionSettingsForm({
  section,
  blockId,
  disabled,
  unavailable,
  locale,
  defaultLocale,
  onChangeSettings,
  onChangeBlockSettings,
}: SectionSettingsFormProps): ReactElement {
  const { t } = useTranslation("marketing");

  if (blockId) {
    const block = section.blocks.find((item) => item.id === blockId);
    const blockDef = block
      ? getBlockDefinition(section.type, block.type)
      : undefined;
    if (!block || !blockDef) {
      return (
        <p className="text-sm text-muted-foreground">
          {t("editor.selectSection")}
        </p>
      );
    }
    return (
      <ScopedSettings
        label={t(blockDef.label)}
        defs={blockDef.settings}
        values={block.settings}
        disabled={disabled}
        locale={locale}
        defaultLocale={defaultLocale}
        onChange={(settings) => onChangeBlockSettings(block.id, settings)}
      />
    );
  }

  /*
   * 不认识的段：连字段都不认识，谈不上编辑。给一句说明 + 原始 type，让租户知道
   * 「这块内容还在、只是当前渲染不出来」——面板空着的话看上去就像坏了。
   * 左树上它照常能选中能删，想清掉随时能清。
   */
  if (section.type === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        {t("editor.unsupportedSection", {
          type: section.source?.type || "?",
        })}
      </p>
    );
  }

  const def = getSectionDefinition(section.type);
  // 认不出来的段在上面那支就返回了；这里还拿不到定义只可能是贡献段没在客户端注册
  if (!def) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("editor.unsupportedSection", { type: section.type })}
      </p>
    );
  }
  return (
    <ScopedSettings
      label={t(def.label)}
      defs={def.settings}
      values={section.settings}
      disabled={disabled}
      unavailable={unavailable}
      locale={locale}
      defaultLocale={defaultLocale}
      onChange={onChangeSettings}
    />
  );
}

function ScopedSettings({
  label,
  defs,
  values,
  disabled,
  unavailable,
  locale,
  defaultLocale,
  onChange,
}: {
  label: string;
  defs: SettingDef[];
  values: SettingValues;
  disabled?: boolean;
  unavailable?: Record<string, string>;
  locale: AppLocale;
  defaultLocale: AppLocale;
  onChange: (settings: SettingValues) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const scopes = splitSettingsByScope(defs);
  const tabs: SettingsTab[] = (
    [
      {
        value: "content",
        labelKey: "editor.tabContent",
        icon: Type,
        defs: scopes.content,
      },
      {
        value: "layout",
        labelKey: "editor.tabLayout",
        icon: LayoutTemplate,
        defs: scopes.layout,
      },
      {
        value: "appearance",
        labelKey: "editor.tabAppearance",
        icon: Palette,
        defs: scopes.appearance,
      },
    ] as const
  ).filter((tab) => hasFields(tab.defs));

  const fieldsFor = (scopeDefs: SettingDef[]) => (
    <SettingsFields
      defs={scopeDefs}
      values={values}
      disabled={disabled}
      unavailable={unavailable}
      locale={locale}
      defaultLocale={defaultLocale}
      onChange={onChange}
    />
  );

  return (
    <div className="space-y-3">
      <PanelLabel>{label}</PanelLabel>
      {tabs.length > 1 ? (
        <Tabs defaultValue={tabs[0]!.value}>
          <TabsList className="w-full">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "min-w-0 flex-1 gap-1.5 px-2",
                    // 未激活只留图标，侧栏窄时三个页签才挤得下
                    "[&[data-state=inactive]>span]:hidden",
                  )}
                >
                  <Icon className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{t(tab.labelKey)}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-3">
              {fieldsFor(tab.defs)}
            </TabsContent>
          ))}
        </Tabs>
      ) : tabs.length === 1 ? (
        fieldsFor(tabs[0]!.defs)
      ) : (
        <EmptySettings />
      )}
    </div>
  );
}

function PanelLabel({ children }: { children: string }): ReactElement {
  return (
    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

/** 整段 / 整个子项都没有可配置项——它的样子完全由主题决定。 */
function EmptySettings(): ReactElement {
  const { t } = useTranslation("marketing");
  return (
    <p className="text-sm text-muted-foreground">{t("editor.noSettings")}</p>
  );
}
