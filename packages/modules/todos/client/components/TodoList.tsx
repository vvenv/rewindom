import { Alert, AlertDescription } from "@be-water/ui/alert";
import { Button } from "@be-water/ui/button";
import { Spinner } from "@be-water/ui/spinner";
import { ListTodo } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TodoRow } from "./TodoRow.js";

import type { TodoListItem } from "../../shared/index.js";

interface TodoListProps {
  items: TodoListItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  canWrite: boolean;
  emptyMessage: string;
  onToggle: (item: TodoListItem, completed: boolean) => Promise<boolean>;
  onRename: (item: TodoListItem, title: string) => Promise<boolean>;
  onRemove: (item: TodoListItem) => Promise<boolean>;
  onRetry: () => void;
}

export function TodoList({
  items,
  isLoading,
  isError,
  error,
  canWrite,
  emptyMessage,
  onToggle,
  onRename,
  onRemove,
  onRetry,
}: TodoListProps) {
  const { t } = useTranslation(["todos", "common"]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-5 text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">{t("common:loading")}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            {error instanceof Error ? error.message : t("list.loadFailed")}
          </AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("common:retry")}
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="rounded-full bg-muted p-4">
          <ListTodo className="size-10" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium">{t("list.emptyTitle")}</p>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      {items.map((item) => (
        <TodoRow
          key={item.id}
          item={item}
          canWrite={canWrite}
          onToggle={onToggle}
          onRename={onRename}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}
