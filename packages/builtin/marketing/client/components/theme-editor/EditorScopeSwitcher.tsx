import type { ReactElement } from "react";

import { Button } from "@be-water/ui/button";
import { ButtonGroup } from "@be-water/ui/button-group";
import { Layers, Palette } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EDITOR_SCOPES, type EditorScope } from "../../lib/site-editor-url.js";

const SCOPE_META: Record<EditorScope, { label: string; icon: typeof Layers }> =
  {
    sections: { label: "editor.scope.sections", icon: Layers },
    theme: { label: "editor.scope.theme", icon: Palette },
  };

/**
 * 左栏顶部的层切换：**区块 / 主题**。
 *
 * 主题以前是一整张独立页面，配着一份只能看不能点的静态预览；区块与页头页脚又是两个
 * 各自带预览的全屏编辑器。三样改的是同一个站点、看的是同一块预览，差别只是「现在在
 * 调哪一层」——所以合成一个编辑器，用这里切（与 Shopify 主题编辑器同一口径）。
 *
 * 用两枚按钮而不是下拉：只有两项，下拉要点两次才知道另一项是什么。
 */
export function EditorScopeSwitcher({
  scope,
  onChange,
}: {
  scope: EditorScope;
  onChange: (next: EditorScope) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");

  return (
    <ButtonGroup className="w-full">
      {EDITOR_SCOPES.map((key) => {
        const { label, icon: Icon } = SCOPE_META[key];
        const active = key === scope;
        return (
          <Button
            key={key}
            type="button"
            size="sm"
            className="flex-1"
            variant={active ? "secondary" : "outline"}
            aria-pressed={active}
            onClick={() => onChange(key)}
          >
            <Icon className="size-3.5" />
            {t(label)}
          </Button>
        );
      })}
    </ButtonGroup>
  );
}
