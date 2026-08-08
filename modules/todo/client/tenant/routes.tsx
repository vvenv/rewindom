import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@be-water/module-sdk/client";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const Todos = lazy(() =>
  import("../pages/todos.js").then((module) => ({
    default: module.Todos,
  })),
);

function TodosModuleRoute() {
  const { t } = useTranslation("todo");
  return <TenantModuleRoute moduleId="todo" label={t("title")} />;
}

export function renderTodosRoutes(): ReactNode {
  return (
    <Route element={<TodosModuleRoute />}>
      <Route element={<PermissionRoute permission="todo.read" />}>
        <Route path="/app/todos" element={<Todos />} />
      </Route>
    </Route>
  );
}
