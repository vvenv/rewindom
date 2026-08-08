/**
 * Register server-kernel extension hooks before any module loads prisma.
 * Must be imported first from bootstrap.ts.
 */
import { setPrismaQueryEventListener } from "@be-water/server-kernel/lib/prisma.js";

setPrismaQueryEventListener((event) => {
  void import("@be-water/builtin/slow-query/server/slow-query.service.js").then(
    ({ SlowQueryService }) => {
      SlowQueryService.enqueue(
        event.duration,
        event.query,
        event.params,
        event.target,
      );
    },
  );
});
