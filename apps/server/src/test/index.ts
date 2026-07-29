/**
 * Server assembly test utilities.
 * Generic helpers live in @be-water/server-test.
 */
export {
  createPrismaMock,
  createRouteTestApp,
  createTestUser,
  createTestUserFast,
  cleanupTestUser,
  grantPermission,
  installAuthUserFindUniqueMock,
  mockAssigneeUserFindUnique,
  mockUserFindUnique,
  prismaMock,
  resetPrismaMock,
  resetUserPermissions,
  revokePermission,
  userPermissionCacheKey,
} from "@be-water/server-test";
export type {
  PrismaMock,
  RouteTestAppOptions,
  TestApp,
  TestUser,
} from "@be-water/server-test";

export { createTestApp } from "./create-test-app.js";
