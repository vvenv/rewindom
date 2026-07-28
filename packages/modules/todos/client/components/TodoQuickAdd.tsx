import { useState, type SubmitEvent } from "react";

import { ApiError } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { Input } from "@be-water/ui/input";
import { Spinner } from "@be-water/ui/spinner";
import { toast } from "@be-water/ui/toast";
import { Plus } from "lucide-react";

import { useCreateTodo } from "../hooks/useTodoMutations.js";
import { validateTodoForm, INITIAL_TODO_FORM } from "../lib/todos.js";

/**
 * 待办清单的主要录入方式：单行输入 + 回车即建。
 * 只有标题一个字段，开抽屉填表单反而更慢——其余字段（完成态）在列表里就地改。
 */
export function TodoQuickAdd() {
  const [title, setTitle] = useState("");
  const createMutation = useCreateTodo();

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const values = { ...INITIAL_TODO_FORM, title };
    const validationError = validateTodoForm(values);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await createMutation.mutateAsync({ title: title.trim() });
      setTitle("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "创建失败，请重试");
    }
  };

  return (
    <form className="flex items-center gap-2" onSubmit={handleSubmit}>
      <Input
        value={title}
        placeholder="添加待办，回车保存…"
        aria-label="添加待办"
        onChange={(event) => setTitle(event.target.value)}
      />
      <Button
        type="submit"
        disabled={createMutation.isPending || !title.trim()}
      >
        {createMutation.isPending ? (
          <Spinner className="size-4" />
        ) : (
          <Plus className="size-4" />
        )}
        <span className="hidden md:inline">添加</span>
      </Button>
    </form>
  );
}
