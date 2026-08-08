import React from "react";

import { AuthProvider } from "@be-water/client-kit";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";

import { TaskProvider } from "./contexts/TaskContext.js";

/**
 * 带 TaskProvider 的测试 wrapper。
 *
 * 放在模块内而非 `@be-water/client-test`：测试设施包被 apps、modules、
 * server-kernel 三方共用，若它反向依赖具体模块会形成包级环。
 */
export function createTaskQueryWrapper(
  queryClient: QueryClient,
): ({ children }: { children: React.ReactNode }) => React.ReactNode {
  return ({ children }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(AuthProvider, null, React.createElement(TaskProvider, null, children)),
    );
}
