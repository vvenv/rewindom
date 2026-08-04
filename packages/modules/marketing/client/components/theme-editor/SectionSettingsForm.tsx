import { type ReactElement } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@be-water/ui/tabs";
import { useTranslation } from "react-i18next";

import {
  getBlockDefinition,
  getSectionDefinition,
  splitSettingsByScope,
  type SettingValues,
  type SiteSection,
} from "../../../shared/section-schema.js";

import { SettingsFields } from "./SettingsFields.js";

interface SectionSettingsFormProps {
  section: SiteSection;
  /** 选中 block 时编辑该 block；否则编辑 section 自身 settings。 */
  blockId?: string | null;
  disabled?: boolean;
  onChangeSettings: (settings: SettingValues) => void;
  onChangeBlockSettings: (blockId: string, settings: SettingValues) => void;
}

/**
 * 右侧设置面板：完全由 section-schema 驱动，不再按 type 手写表单。
 *
 * 内容与版式分两个页签——版式项（留白、底色、分隔线、列数）多且改动频率低，
 * 混在正文字段里会把内容压到折叠线以下。分组归属由 schema 的抬头决定。
 */
export function SectionSettingsForm({
  section,
  blockId,
  disabled,
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
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t(blockDef.label)}
        </p>
        <SettingsFields
          defs={blockDef.settings}
          values={block.settings}
          disabled={disabled}
          onChange={(settings) => onChangeBlockSettings(block.id, settings)}
        />
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
      onChange={onChangeSettings}
    />
  );

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t(def.label)}
      </p>
      {layout.length === 0 ? (
        fieldsFor(def.settings)
      ) : (
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
      )}
    </div>
  );
}
