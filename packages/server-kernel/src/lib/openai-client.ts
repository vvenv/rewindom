/**
 * LLM 客户端工厂（OpenAI 兼容接口）。
 *
 * 上游只提供客户端与配置，不预设调用场景；需要 embedding / rerank 的下游
 * 自行在业务模块里建对应客户端，别把厂商特定的能力塞回内核。
 */
import OpenAI from "openai";

import { config } from "./config.js";

export function getLlmClient(options?: { maxRetries?: number }): OpenAI {
  return new OpenAI({
    apiKey: config.openai.apiKey,
    baseURL: config.openai.baseUrl,
    // 默认沿用 SDK（2）；自管重试的调用方应传 maxRetries: 0，避免叠乘放大
    ...(options?.maxRetries !== undefined
      ? { maxRetries: options.maxRetries }
      : {}),
  });
}
