import type { ReactNode } from "react";

import { TaskProvider } from "../contexts/TaskContext.js";

export function BackgroundJobShellProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <TaskProvider>{children}</TaskProvider>;
}
