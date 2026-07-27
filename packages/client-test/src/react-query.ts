import React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { vi } from "vitest";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

export function createQueryWrapper(
  queryClient: QueryClient,
): ({ children }: { children: React.ReactNode }) => React.ReactNode {
  return ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

export function createRenderWithProvider(queryClient: QueryClient) {
  return (component: React.ReactNode) =>
    render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        component,
      ),
    );
}

export interface TestSetup {
  queryClient: QueryClient;
  wrapper: ({ children }: { children: React.ReactNode }) => React.ReactNode;
}

export function setupHookTest(): TestSetup {
  const queryClient = createTestQueryClient();
  const wrapper = createQueryWrapper(queryClient);
  vi.clearAllMocks();
  return { queryClient, wrapper };
}
