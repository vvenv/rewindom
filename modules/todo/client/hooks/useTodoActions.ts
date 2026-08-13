import { useCallback } from "react";

import { ApiError, useConfirm } from "@rewindom/module-sdk/client";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("todo");
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
        toast.error(describeError(err, t("toast.createFailed")));
        return false;
      }
    },
    [createMutation, t],
  );

  const setCompleted = useCallback(
    async (item: TodoListItem, completed: boolean): Promise<boolean> => {
      try {
        await updateMutation.mutateAsync({ id: item.id, completed });
        return true;
      } catch (err) {
        toast.error(describeError(err, t("toast.updateFailed")));
        return false;
      }
    },
    [t, updateMutation],
  );

  const renameTodo = useCallback(
    async (item: TodoListItem, title: string): Promise<boolean> => {
      try {
        await updateMutation.mutateAsync({ id: item.id, title });
        return true;
      } catch (err) {
        toast.error(describeError(err, t("toast.saveFailed")));
        return false;
      }
    },
    [t, updateMutation],
  );

  const removeTodo = useCallback(
    async (item: TodoListItem): Promise<boolean> => {
      try {
        await deleteMutation.mutateAsync(item.id);
      } catch (err) {
        toast.error(describeError(err, t("toast.deleteFailed")));
        return false;
      }

      toast.success(t("toast.deleted"), {
        action: {
          label: t("toast.undo"),
          onClick: () => {
            void createMutation
              .mutateAsync({ title: item.title, completed: item.completed })
              .catch((err: unknown) => {
                toast.error(describeError(err, t("toast.undoFailed")));
              });
          },
        },
      });
      return true;
    },
    [createMutation, deleteMutation, t],
  );

  const toggleAll = useCallback(
    async (completed: boolean): Promise<boolean> => {
      try {
        await toggleAllMutation.mutateAsync(completed);
        return true;
      } catch (err) {
        toast.error(describeError(err, t("toast.toggleAllFailed")));
        return false;
      }
    },
    [t, toggleAllMutation],
  );

  const clearCompleted = useCallback(async (): Promise<boolean> => {
    const confirmed = await confirm({
      title: t("confirm.clearCompletedTitle"),
      description: t("confirm.clearCompletedDescription"),
      destructive: true,
    });
    if (!confirmed) {
      return false;
    }

    try {
      const { deleted } = await clearMutation.mutateAsync();
      toast.success(
        deleted > 0
          ? t("toast.clearedCount", { count: deleted })
          : t("toast.noCompleted"),
      );
      return true;
    } catch (err) {
      toast.error(describeError(err, t("toast.clearFailed")));
      return false;
    }
  }, [clearMutation, confirm, t]);

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
