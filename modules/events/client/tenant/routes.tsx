import { lazy, type ReactNode } from "react";

import {
  PermissionRoute,
  TenantModuleRoute,
} from "@rewindom/module-sdk/client";
import { useTranslation } from "react-i18next";
import { Route } from "react-router";

const Events = lazy(() =>
  import("../pages/events.js").then((module) => ({ default: module.Events })),
);

const EventSources = lazy(() =>
  import("../pages/event-sources.js").then((module) => ({
    default: module.EventSources,
  })),
);

const EventDetail = lazy(() =>
  import("../pages/event-detail.js").then((module) => ({
    default: module.EventDetail,
  })),
);

function EventsModuleRoute() {
  const { t } = useTranslation("events");
  return <TenantModuleRoute moduleId="events" label={t("title")} />;
}

export function renderEventsRoutes(): ReactNode {
  return (
    <Route element={<EventsModuleRoute />}>
      <Route element={<PermissionRoute permission="events.read" />}>
        <Route path="/app/events" element={<Events />} />
        <Route path="/app/events/sources" element={<EventSources />} />
        {/* path 参数用 camelCase（field-naming rule） */}
        <Route path="/app/events/:eventId" element={<EventDetail />} />
      </Route>
    </Route>
  );
}
