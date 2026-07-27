import { http, HttpResponse } from "msw";

/**
 * Default MSW handlers for intercepting `/api/*` in client tests.
 */
export const defaultHandlers = [
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      data: {
        id: "user1",
        username: "testuser",
        actor_type: "tenant_user",
        is_system_admin: false,
        enabled: true,
        last_login_at: null,
        last_access_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }),
  ),

  http.get("/api/users", () => HttpResponse.json({ data: [] })),

  http.get("/src/*", () => HttpResponse.json({})),
];
