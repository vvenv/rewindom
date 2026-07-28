import { useCallback } from "react";

import { ApiError, useConfirm } from "@be-water/client-kit";
import { toast } from "@be-water/ui/toast";

import {
  useClearCompletedTodos,
  useCreateTodo,
  useDeleteTodo,
  useToggleAllTodos,
  useUpdateTodo,
} from "./useTodoMutations.js";

import type { TodoListItem } from "../../shared/index.js";

function describeError(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * 待办的写操作集合。单条操作按 TodoMVC 的手感来：点了就生效，不弹确认；
 * 删除给一个「撤销」兜底（重建一条同内容的，id 会变）。
 * 只有「清除已完成」保留确认——它一次抹掉多条，撤销一条一条重建并不划算。
 */
export function useTodoActions() {
  const { confirm } = useConfirm();
  const createMutation = useCreateTodo();
  const updateMutation = useUpdateTodo();
  const deleteMutation = useDeleteTodo();
  const toggleAllMutation = useToggleAllTodos();
  const clearMutation = useClearCompletedTodos();

  const addTodo = useCallback(
    async (title: string): Promise<boolean> => {
      try {
        await createMutation.mutateAsync({ title });
        return true;
      } catch (err) {
        toast.error(describeError(err, "创建失败，请重试"));
        return false;
      }
    },
    [createMutation],
  );

  const setCompleted = useCallback(
    async (item: TodoListItem, completed: boolean): Promise<boolean> => {
      try {
        await updateMutation.mutateAsync({ id: item.id, completed });
        return true;
      } catch (err) {
        toast.error(describeError(err, "更新失败，请重试"));
        return false;
      }
    },
    [updateMutation],
  );

  const renameTodo = useCallback(
    async (item: TodoListItem, title: string): Promise<boolean> => {
      try {
        await updateMutation.mutateAsync({ id: item.id, title });
        return true;
      } catch (err) {
        toast.error(describeError(err, "保存失败，请重试"));
        return false;
      }
    },
    [updateMutation],
  );

  const removeTodo = useCallback(
    async (item: TodoListItem): Promise<boolean> => {
      try {
        await deleteMutation.mutateAsync(item.id);
      } catch (err) {
        toast.error(describeError(err, "删除失败，请重试"));
        return false;
      }

      toast.success("已删除", {
        action: {
          label: "撤销",
          onClick: () => {
            void createMutation
              .mutateAsync({ title: item.title, completed: item.completed })
              .catch((err: unknown) => {
                toast.error(describeError(err, "撤销失败，请重新添加"));
              });
          },
        },
      });
      return true;
    },
    [createMutation, deleteMutation],
  );

  const toggleAll = useCallback(
    async (completed: boolean): Promise<boolean> => {
      try {
        await toggleAllMutation.mutateAsync(completed);
        return true;
      } catch (err) {
        toast.error(describeError(err, "操作失败，请重试"));
        return false;
      }
    },
    [toggleAllMutation],
  );

  const clearCompleted = useCallback(async (): Promise<boolean> => {
    const confirmed = await confirm({
      title: "清除已完成",
      description: "将删除全部已完成的待办，此操作不可撤销。",
      destructive: true,
    });
    if (!confirmed) {
      return false;
    }

    try {
      const { deleted } = await clearMutation.mutateAsync();
      toast.success(deleted > 0 ? `已清除 ${deleted} 条` : "没有已完成的待办");
      return true;
    } catch (err) {
      toast.error(describeError(err, "清除失败，请重试"));
      return false;
    }
  }, [clearMutation, confirm]);

  return {
    addTodo,
    setCompleted,
    renameTodo,
    removeTodo,
    toggleAll,
    clearCompleted,
    isTogglingAll: toggleAllMutation.isPending,
    isClearing: clearMutation.isPending,
  };
}

export type TodoActions = ReturnType<typeof useTodoActions>;
