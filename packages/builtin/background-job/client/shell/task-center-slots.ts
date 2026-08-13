import { createComponentSlot } from "@rewindom/client-kit";

import type { BackgroundTask } from "../contexts/TaskContext.js";

export interface TaskCardExtrasProps {
  task: BackgroundTask;
  /** 业务模块展示进度条等增强 UI 时，可隐藏通用 description 避免重复。 */
  onProgressVisible?: (visible: boolean) => void;
}

/**
 * 任务卡片增强 slot（由业务模块注册，用于展示自己的任务进度）。
 * 消费方：TaskCenter TaskCard 内 `.useSlot()` 渲染。
 */
export const taskCardExtrasSlot =
  createComponentSlot<TaskCardExtrasProps>("TaskCardExtrasSlot");
