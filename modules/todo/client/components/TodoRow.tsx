import { useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@rewindom/ui/button";
import { Checkbox } from "@rewindom/ui/checkbox";
import { Input } from "@rewindom/ui/input";
import { toast } from "@rewindom/ui/toast";
import { cn } from "@rewindom/ui/utils";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  TODO_TITLE_MAX_LENGTH,
  resolveTodoTitleEdit,
} from "../lib/todos.js";

import type { TodoListItem } from "../../shared/index.js";

interface TodoRowProps {
  item: TodoListItem;
  canWrite: boolean;
  onToggle: (item: TodoListItem, completed: boolean) => Promise<boolean>;
  onRename: (item: TodoListItem, title: string) => Promise<boolean>;
  onRemove: (item: TodoListItem) => Promise<boolean>;
}

/**
 * 单行待办：勾选完成、双击标题就地改、右侧 × 删除。
 * 就地编辑的收尾规则（Enter/失焦保存、Esc 放弃、清空即删）都走 `resolveTodoTitleEdit`。
 */
export function TodoRow({
  item,
  canWrite,
  onToggle,
  onRename,
  onRemove,
}: TodoRowProps) {
  const { t } = useTranslation("todo");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);
  const [pending, setPending] = useState(false);
  // Esc 会先把输入框摘掉，摘掉又可能触发一次 blur——用它挡住紧随其后的保存
  const abandonedRef = useRef(false);

  const startEditing = () => {
    if (!canWrite || pending) {
      return;
    }
    abandonedRef.current = false;
    setDraft(item.title);
    setEditing(true);
  };

  const commit = async () => {
    if (abandonedRef.current) {
      return;
    }

    const edit = resolveTodoTitleEdit(item.title, draft);
    if (edit.action === "invalid") {
      toast.error(t(edit.message, { max: TODO_TITLE_MAX_LENGTH }));
      return;
    }

    setEditing(false);
    if (edit.action === "none") {
      return;
    }

    setPending(true);
    const ok =
      edit.action === "delete"
        ? await onRemove(item)
        : await onRename(item, edit.title);
    setPending(false);
    if (!ok) {
      // 没存上就把编辑框重新打开，别让用户刚敲的字凭空消失
      setEditing(true);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void commit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      abandonedRef.current = true;
      setDraft(item.title);
      setEditing(false);
    }
  };

  const handleToggle = async (completed: boolean) => {
    setPending(true);
    await onToggle(item, completed);
    setPending(false);
  };

  const handleRemove = async () => {
    setPending(true);
    await onRemove(item);
    setPending(false);
  };

  return (
    <li className="group flex items-center gap-3 border-b border-foreground/10 px-3 py-2.5 last:border-b-0">
      <Checkbox
        checked={item.completed}
        disabled={!canWrite || pending || editing}
        aria-label={
          item.completed
            ? t("row.markIncomplete", { title: item.title })
            : t("row.markComplete", { title: item.title })
        }
        // 已完成的勾选框压成灰调：主色留给「还要做的」，做完的不该继续抢注意力
        className="data-checked:border-transparent data-checked:bg-muted-foreground/30 data-checked:text-muted-foreground"
        onCheckedChange={(checked) => void handleToggle(checked === true)}
      />

      {editing ? (
        <Input
          autoFocus
          value={draft}
          aria-label={t("row.edit", { title: item.title })}
          className="h-7 flex-1 py-0"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => void commit()}
        />
      ) : (
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            canWrite && "cursor-text",
            item.completed && "text-muted-foreground line-through",
          )}
          title={canWrite ? t("row.doubleClickEdit") : undefined}
          onDoubleClick={startEditing}
        >
          {item.title}
        </span>
      )}

      {canWrite && !editing ? (
        <Button
          size="icon"
          variant="ghost"
          aria-label={t("row.delete", { title: item.title })}
          disabled={pending}
          // 触屏没有 hover，小屏一律显示；桌面端才藏起来等 hover / 键盘聚焦
          className="text-muted-foreground opacity-100 transition-opacity hover:text-destructive focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
          onClick={() => void handleRemove()}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </li>
  );
}
