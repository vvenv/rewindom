/**
 * @rewindom/server-kernel
 *
 * Package layout (import via subpaths, e.g. `@rewindom/server-kernel/lib/prisma.js`):
 * - kernel/   — HTTP shell routes & auth
 * - runtime/  — plugin loader, ProviderRegistry, tenant gating
 * - infra/    — Redis, scheduler, file storage
 * - http/     — route utilities
 * - middleware/
 * - lib/      — config, prisma, logger, errors
 */

export type { ServerAppModule } from "./runtime/module-contract.js";
