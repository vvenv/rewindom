import { PageLayout, usePermissions } from "@be-water/client-kit";
import { ListTodo } from "lucide-react";

import { TodoFilters } from "../components/TodoFilters.js";
import { TodoQuickAdd } from "../components/TodoQuickAdd.js";
import { TodosTable } from "../components/TodosTable.js";
import { useTodos } from "../hooks/useTodos.js";
import { useTodosPage } from "../hooks/useTodosPage.js";

export function Todos() {
  const {
    q,
    status,
    completed,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    handleSortingChange,
    handleFiltersChange,
  } = useTodosPage();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("todos.write");
  const { data, isLoading, isError, error, refetch } = useTodos(
    page,
    pageSize,
    q,
    completed,
    sortBy,
    sortDir,
  );

  // 录入入口是页内的快速添加行，不再用 FAB / 抽屉——待办的新建成本必须低到一行
  return (
    <PageLayout icon={ListTodo} title="待办" description="租户内待办清单">
      <div className="flex flex-col gap-4">
        {canWrite ? <TodoQuickAdd /> : null}
        <TodoFilters
          q={q}
          status={status}
          onFiltersChange={handleFiltersChange}
        />
        <TodosTable
          items={data?.items ?? []}
          isLoading={isLoading}
          isError={isError}
          error={error}
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          pageCount={data?.page_count}
          q={q}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          onRetry={() => void refetch()}
        />
      </div>
    </PageLayout>
  );
}
