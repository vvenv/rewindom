import { useEffect, useState, type ReactNode, type SubmitEvent } from "react";

import { ApiError } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { Spinner } from "@be-water/ui/spinner";
import { Switch } from "@be-water/ui/switch";
import { toast } from "@be-water/ui/toast";
import { Pencil } from "lucide-react";

import { useTodo } from "../hooks/useTodo.js";
import { useUpdateTodo } from "../hooks/useTodoMutations.js";
import {
  buildTodoPayload,
  INITIAL_TODO_FORM,
  validateTodoForm,
  type TodoFormValues,
} from "../lib/todos.js";

import type { TodoListItem } from "../../shared/index.js";

interface TodoEditSheetProps {
  item: TodoListItem;
  children?: ReactNode;
}

export function TodoEditSheet({ item, children }: TodoEditSheetProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TodoFormValues>(INITIAL_TODO_FORM);
  const [error, setError] = useState("");
  const { data: detail, isLoading } = useTodo(item.id, open);
  const updateMutation = useUpdateTodo();

  useEffect(() => {
    if (detail) {
      setForm({
        title: detail.title,
        completed: detail.completed,
      });
      setError("");
    }
  }, [detail]);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const validationError = validateTodoForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: item.id,
        ...buildTodoPayload(form),
      });
      toast.success("已更新");
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "更新失败，请重试");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children ?? (
          <Button size="icon" variant="ghost" aria-label="编辑">
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>编辑待办</SheetTitle>
            <SheetDescription>修改后保存即可生效。</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : (
            <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
              <Field>
                <FieldLabel htmlFor={`todo-title-${item.id}`}>标题</FieldLabel>
                <Input
                  id={`todo-title-${item.id}`}
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor={`todo-completed-${item.id}`}>
                  已完成
                </FieldLabel>
                <Switch
                  id={`todo-completed-${item.id}`}
                  checked={form.completed}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, completed: checked }))
                  }
                />
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
            </FieldGroup>
          )}

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                取消
              </Button>
            </SheetClose>
            <Button
              type="submit"
              disabled={updateMutation.isPending || isLoading}
            >
              {updateMutation.isPending ? <Spinner className="size-4" /> : null}
              保存
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
