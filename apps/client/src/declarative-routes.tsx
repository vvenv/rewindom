import { Fragment, type ReactNode } from "react";

import { PermissionRoute, TenantEntitlementRoute, type ClientRouteDefinition   } from "@be-water/client-kit";
import { Route } from "react-router";



function wrapRouteGuards(
  route: ClientRouteDefinition,
  inner: ReactNode,
): ReactNode {
  if (route.tenantFeature) {
    return (
      <Route
        key={`${route.path}-feature`}
        element={<TenantEntitlementRoute feature={route.tenantFeature} />}
      >
        {inner}
      </Route>
    );
  }

  if (route.permission) {
    const permissionElement = Array.isArray(route.permission) ? (
      <PermissionRoute anyOf={route.permission} />
    ) : (
      <PermissionRoute permission={route.permission} />
    );
    return (
      <Route key={`${route.path}-permission`} element={permissionElement}>
        {inner}
      </Route>
    );
  }

  return inner;
}

export function renderDeclarativeRoutes(
  routes: readonly ClientRouteDefinition[],
): ReactNode {
  return routes.map((route) => {
    const inner = (
      <Route key={route.path} path={route.path} element={<route.element />}>
        {route.children ? renderDeclarativeRoutes(route.children) : null}
      </Route>
    );

    return wrapRouteGuards(route, inner);
  });
}

export function renderModuleDeclarativeRoutes(
  moduleId: string,
  routes: readonly ClientRouteDefinition[],
): ReactNode {
  return (
    <Fragment key={moduleId}>{renderDeclarativeRoutes(routes)}</Fragment>
  );
}
