import { lazy, type ReactNode } from "react";

import { PermissionRoute, TenantModuleRoute } from "@be-water/client-kit";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const Todos = lazy(() =>
  import("../pages/todos.js").then((module) => ({
    default: module.Todos,
  })),
);

function TodosModuleRoute() {
  const { t } = useTranslation("todos");
  return <TenantModuleRoute moduleId="todos" label={t("title")} />;
}

export function renderTodosRoutes(): ReactNode {
  return (
    <Route element={<TodosModuleRoute />}>
      <Route element={<PermissionRoute permission="todos.read" />}>
        <Route path="/todos" element={<Todos />} />
      </Route>
    </Route>
  );
}
