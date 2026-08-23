import { lazy, type ReactNode } from "react";

import {
  PermissionRoute,
  TenantModuleRoute,
} from "@rewindom/module-sdk/client";
import { Route } from "react-router";

const Newsletter = lazy(() =>
  import("../pages/newsletter.js").then((module) => ({
    default: module.Newsletter,
  })),
);

export function renderNewsletterRoutes(): ReactNode {
  return (
    <Route element={<TenantModuleRoute moduleId="newsletter" />}>
      <Route element={<PermissionRoute permission="newsletter.read" />}>
        <Route path="/app/newsletter" element={<Newsletter />} />
      </Route>
    </Route>
  );
}
