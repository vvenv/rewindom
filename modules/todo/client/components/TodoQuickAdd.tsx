import { useState, type SubmitEvent } from "react";

import { Checkbox } from "@be-water/ui/checkbox";
import { Input } from "@be-water/ui/input";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";

import { TODO_TITLE_MAX_LENGTH, validateTodoTitle } from "../lib/todos.js";

interface TodoQuickAddProps {
  /** 全部已完成时勾上；无待办时禁用 */
  allCompleted: boolean;
  hasTodos: boolean;
  isTogglingAll: boolean;
  onAdd: (title: string) => Promise<boolean>;
  onToggleAll: (completed: boolean) => void;
}

/**
 * 待办清单的录入行：左侧一键全选，右侧单行输入 + 回车即建。
 * 只有标题一个字段，开抽屉填表单反而更慢——完成态在列表里就地勾。
 */
export function TodoQuickAdd({
  allCompleted,
  hasTodos,
  isTogglingAll,
  onAdd,
  onToggleAll,
}: TodoQuickAddProps) {
  const { t } = useTranslation("todo");
  const [title, setTitle] = useState("");

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const value = title.trim();
    if (!value) {
      // 空回车静默忽略：连着敲回车不该弹一串报错
      return;
    }

    const validationError = validateTodoTitle(value);
    if (validationError) {
      toast.error(t(validationError, { max: TODO_TITLE_MAX_LENGTH }));
      return;
    }

    // 先清空再发请求，好让下一条紧接着敲；失败了再把原文放回去
    setTitle("");
    const created = await onAdd(value);
    if (!created) {
      setTitle((current) => (current === "" ? value : current));
    }
  };

  return (
    <form
      className="flex items-center gap-3 rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10"
      onSubmit={handleSubmit}
    >
      <Checkbox
        checked={allCompleted}
        disabled={!hasTodos || isTogglingAll}
        aria-label={
          allCompleted
            ? t("quickAdd.markAllIncomplete")
            : t("quickAdd.markAllComplete")
        }
        className="data-checked:border-transparent data-checked:bg-muted-foreground/30 data-checked:text-muted-foreground"
        onCheckedChange={(checked) => onToggleAll(checked === true)}
      />
      <Input
        autoFocus
        value={title}
        placeholder={t("quickAdd.placeholder")}
        aria-label={t("quickAdd.ariaLabel")}
        className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        onChange={(event) => setTitle(event.target.value)}
      />
    </form>
  );
}
