import { type ReactElement } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@be-water/ui/tabs";
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
  return defs.some((def) => def.type !== "header");
}

/**
 * 右侧设置面板：完全由 section-schema 驱动，不再按 type 手写表单。
 *
 * 内容与版式分两个页签——版式项（留白、底色、分隔线、列数）多且改动频率低，
 * 混在正文字段里会把内容压到折叠线以下。分组归属由 schema 的抬头决定。
 * 只有一组有字段时不套页签（单页签点了也没别处可去），两组都空则只留一句提示。
 */
export function SectionSettingsForm({
  section,
  blockId,
  disabled,
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
    // block 没有版式设置，不套页签
    return (
      <div className="space-y-3">
        <PanelLabel>{t(blockDef.label)}</PanelLabel>
        {hasFields(blockDef.settings) ? (
          <SettingsFields
            defs={blockDef.settings}
            values={block.settings}
            disabled={disabled}
            locale={locale}
            defaultLocale={defaultLocale}
            onChange={(settings) => onChangeBlockSettings(block.id, settings)}
          />
        ) : (
          <EmptySettings />
        )}
      </div>
    );
  }

  const def = getSectionDefinition(section.type);
  const { content, layout } = splitSettingsByScope(def.settings);
  const fieldsFor = (defs: typeof def.settings) => (
    <SettingsFields
      defs={defs}
      values={section.settings}
      disabled={disabled}
      locale={locale}
      defaultLocale={defaultLocale}
      onChange={onChangeSettings}
    />
  );

  const hasContent = hasFields(content);
  const hasLayout = hasFields(layout);

  return (
    <div className="space-y-3">
      <PanelLabel>{t(def.label)}</PanelLabel>
      {hasContent && hasLayout ? (
        <Tabs defaultValue="content">
          <TabsList className="w-full">
            <TabsTrigger value="content" className="flex-1">
              {t("editor.tabContent")}
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex-1">
              {t("editor.tabLayout")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="mt-3">
            {fieldsFor(content)}
          </TabsContent>
          <TabsContent value="layout" className="mt-3">
            {fieldsFor(layout)}
          </TabsContent>
        </Tabs>
      ) : hasContent ? (
        fieldsFor(content)
      ) : hasLayout ? (
        fieldsFor(layout)
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
