import {
  ApiError,
  PageFilterBar,
  useConfirm,
  usePermissions,
} from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { toast } from "@be-water/ui/toast";
import { Eraser } from "lucide-react";

import { useClearCompletedTodos } from "../hooks/useTodoMutations.js";
import {
  TODO_STATUS_ALL,
  TODO_STATUS_FILTER_OPTIONS,
  type TodoStatusFilter,
} from "../lib/todos.js";

interface TodoFiltersProps {
  q?: string;
  status: TodoStatusFilter;
  onFiltersChange: (filters: { q?: string; status?: TodoStatusFilter }) => void;
}

export function TodoFilters({ q, status, onFiltersChange }: TodoFiltersProps) {
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const clearMutation = useClearCompletedTodos();
  const canWrite = hasPermission("todos.write");

  const handleClearCompleted = async () => {
    const confirmed = await confirm({
      title: "清除已完成",
      description: "将删除全部已完成的待办，此操作不可撤销。",
      destructive: true,
    });
    if (!confirmed) {
      return;
    }

    try {
      const { deleted } = await clearMutation.mutateAsync();
      toast.success(deleted > 0 ? `已清除 ${deleted} 条` : "没有已完成的待办");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "清除失败，请重试");
    }
  };

  return (
    <PageFilterBar
      search={{
        value: q,
        onCommit: (value) => {
          onFiltersChange({ q: value.trim() || undefined, status });
        },
        placeholder: "搜索待办…",
        className: "max-w-56",
      }}
      groups={[
        {
          id: "status",
          options: [...TODO_STATUS_FILTER_OPTIONS],
          value: status,
          neutralValue: TODO_STATUS_ALL,
          onChange: (value) => {
            onFiltersChange({ q, status: value as TodoStatusFilter });
          },
        },
      ]}
      inlineContent={
        canWrite ? (
          <Button
            type="button"
            variant="outline"
            disabled={clearMutation.isPending}
            onClick={() => void handleClearCompleted()}
          >
            <Eraser className="size-4" />
            <span className="hidden md:inline">清除已完成</span>
          </Button>
        ) : null
      }
      hasActiveFilters={Boolean(q) || status !== TODO_STATUS_ALL}
      onReset={() => onFiltersChange({ q: undefined, status: TODO_STATUS_ALL })}
    />
  );
}
