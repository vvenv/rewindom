import { type ReactElement } from "react";

import MDEditor from "@uiw/react-md-editor";
import {
  getCommands as getCommandsCn,
  getExtraCommands as getExtraCommandsCn,
} from "@uiw/react-md-editor/commands-cn";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

/**
 * 全屏 Markdown 编辑面板。
 *
 * **单独成文件是为了 `lazy()`**：编辑器连着 rehype / prism 一大串依赖，而绝大多数
 * 编辑器会话根本不会点开它。跟 `MarkdownFullscreenDialog` 写在一起，就等于每次打开
 * `/app/site` 都先下一遍 Markdown 工具链。
 */
export function MarkdownFullscreenEditor({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (next: string) => void;
}): ReactElement {
  const { i18n } = useTranslation("marketing");
  const { resolvedTheme } = useTheme();

  // 编辑器自带一套配色，只认 `data-color-mode`——不喂它就永远是浅色，
  // 深色主题下开出来是一块白板。
  const colorMode = resolvedTheme === "dark" ? "dark" : "light";
  const zh = i18n.language.startsWith("zh");

  return (
    <MDEditor
      value={value}
      onChange={(next) => onChange(next ?? "")}
      data-color-mode={colorMode}
      height="100%"
      // 高度写成百分比时 Dragbar 本就失效（上游已知限制），显式关掉免得多一条死拖拽条。
      visibleDragbar={false}
      preview="live"
      commands={zh ? getCommandsCn() : undefined}
      extraCommands={zh ? getExtraCommandsCn() : undefined}
      // 我们自己已经在全屏弹层里了：再留一颗上游的全屏按钮，点下去会去改 body 样式，
      // 和 Dialog 的滚动锁互相打架。
      commandsFilter={(command) =>
        command.name === "fullscreen" ? false : command
      }
      textareaProps={{ placeholder }}
      className="!h-full !rounded-none !border-0 !shadow-none"
    />
  );
}
