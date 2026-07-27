import {
  createRouteTestApp,
  createTestUserFast,
  cleanupTestUser,
  grantPermission,
  type TestApp,
  type TestUser,
} from "@be-water/server-test";

import { backgroundJobRoutes } from "./routes.js";

export type { TestApp, TestUser };

export async function setupBackgroundJobRouteTestSuite(): Promise<{
  app: TestApp;
  adminUser: TestUser;
  suiteId: string;
}> {
  const suiteId = Math.random().toString(36).slice(2);
  const app = await createRouteTestApp(async (instance) => {
    await instance.register(backgroundJobRoutes, {
      prefix: "/api/background-jobs",
    });
  });
  const adminUser = await createTestUserFast(
    app,
    `adminuser_${suiteId}`,
    "password123",
    { is_system_admin: true },
  );
  return { app, adminUser, suiteId };
}

export async function teardownBackgroundJobRouteTestSuite(
  app: TestApp,
  userId: string,
): Promise<void> {
  await cleanupTestUser(app, userId);
  await app.close();
}

export { grantPermission, createTestUserFast, cleanupTestUser };
