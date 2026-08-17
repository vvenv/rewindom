/**
 * LLM 客户端工厂（OpenAI 兼容接口）。
 *
 * 上游只提供客户端与配置，不预设调用场景；需要 embedding / rerank 的下游
 * 自行在业务模块里建对应客户端，别把厂商特定的能力塞回内核。
 *
 * 密钥按租户解析：先 `resolveLlmConfig(tenantId)`，再交给本工厂。
 */
import OpenAI from "openai";

import type { ResolvedLlmConfig } from "./tenant-llm.js";

export function getLlmClient(
  llm: Pick<ResolvedLlmConfig, "apiKey" | "baseUrl">,
  options?: { maxRetries?: number },
): OpenAI {
  return new OpenAI({
    apiKey: llm.apiKey,
    baseURL: llm.baseUrl,
    // 默认沿用 SDK（2）；自管重试的调用方应传 maxRetries: 0，避免叠乘放大
    ...(options?.maxRetries !== undefined
      ? { maxRetries: options.maxRetries }
      : {}),
  });
}
