export class BackgroundJobCancelledError extends Error {
  constructor() {
    super("任务已取消");
    this.name = "BackgroundJobCancelledError";
  }
}
