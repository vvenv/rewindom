import { type TenantLimitKey } from "../../shared/index.js";

export class LimitExceededError extends Error {
  readonly limitKey: TenantLimitKey;

  readonly limit: number;

  constructor(limitKey: TenantLimitKey, limit: number, message: string) {
    super(message);
    this.name = "LimitExceededError";
    this.limitKey = limitKey;
    this.limit = limit;
  }
}
