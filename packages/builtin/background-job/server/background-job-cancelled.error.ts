import { AppError } from "@rewindom/server-kernel/lib/app-errors.js";

export class BackgroundJobCancelledError extends AppError {
  constructor() {
    super({ code: "job.cancelled", status: 409 });
    this.name = "BackgroundJobCancelledError";
  }
}
