import { useContext } from "react";

import { TaskContext, type TaskContextValue } from "../contexts/TaskContext.js";

export function useTaskCenter(): TaskContextValue {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTaskCenter必须在TaskProvider中使用");
  }
  return context;
}
