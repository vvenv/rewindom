import { PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { ListTodo } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TodoFooter } from "../components/TodoFooter.js";
import { TodoList } from "../components/TodoList.js";
import { TodoQuickAdd } from "../components/TodoQuickAdd.js";
import { useTodoActions } from "../hooks/useTodoActions.js";
import { useTodos } from "../hooks/useTodos.js";
import { useTodosPage } from "../hooks/useTodosPage.js";
import { TODO_STATUS_ALL } from "../lib/todos.js";

export function Todos() {
  const { t } = useTranslation("todo");
  const { q, status, completed, page, pageSize, handleFiltersChange } =
    useTodosPage();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("todo.write");
  const { data, isLoading, isError, error, refetch } = useTodos(
    page,
    pageSize,
    q,
    completed,
  );
  const actions = useTodoActions();

  const items = data?.items ?? [];
  const activeCount = data?.active_count ?? 0;
  const completedCount = data?.completed_count ?? 0;
  const totalCount = activeCount + completedCount;
  const isFiltered = Boolean(q) || status !== TODO_STATUS_ALL;
  // 一条待办都没有时不摆页脚（TodoMVC 同款）；但筛出空结果时要留着，否则退不回全部
  const showFooter = totalCount > 0 || isFiltered;

  // 录入入口是页内的快速添加行，不再用 FAB / 抽屉——待办的新建成本必须低到一行
  return (
    <PageLayout
      icon={ListTodo}
      title={t("title")}
      description={t("description")}
    >
      <div className="flex flex-col gap-4">
        {canWrite ? (
          <TodoQuickAdd
            allCompleted={totalCount > 0 && activeCount === 0}
            hasTodos={totalCount > 0}
            isTogglingAll={actions.isTogglingAll}
            onAdd={actions.addTodo}
            onToggleAll={(value) => void actions.toggleAll(value)}
          />
        ) : null}

        <TodoList
          items={items}
          isLoading={isLoading && items.length === 0}
          isError={isError && items.length === 0}
          error={error}
          canWrite={canWrite}
          isFiltered={isFiltered}
          onToggle={actions.setCompleted}
          onRename={actions.renameTodo}
          onRemove={actions.removeTodo}
          onRetry={() => void refetch()}
        />

        {showFooter ? (
          <TodoFooter
            activeCount={activeCount}
            completedCount={completedCount}
            q={q}
            status={status}
            canWrite={canWrite}
            isClearing={actions.isClearing}
            page={page}
            pageSize={pageSize}
            total={data?.total ?? 0}
            pageCount={data?.page_count ?? 0}
            onFiltersChange={handleFiltersChange}
            onClearCompleted={() => void actions.clearCompleted()}
          />
        ) : null}
      </div>
    </PageLayout>
  );
}
