import type { EventSourceKind, EventTopic } from "../../shared/index.js";

/**
 * connector 产出的原始信号——尚未规范化 URL、尚未归属到任何事件。
 *
 * 每个 connector 只负责「把外部世界翻译成 RawSignal」，
 * 去重、聚类、热度全部在 ingest.service 之后统一做。这样加一个源
 * 就只是加一个纯函数，不用碰流水线。
 */
export interface RawSignal {
  external_id: string;
  source_name: string;
  source_kind: EventSourceKind;
  title: string;
  url: string;
  excerpt: string;
  author: string | null;
  topic: EventTopic;
  score: number;
  comment_count: number;
  published_at: Date;
}

/** connector 拿到的源配置（EventFeed 的子集，避免 connector 依赖 Prisma 类型）。 */
export interface ConnectorFeed {
  id: string;
  connector: string;
  name: string;
  url: string;
  source_kind: EventSourceKind;
  topic: EventTopic;
}

export interface EventConnector {
  id: string;
  /** 抓一轮。抛错由 ingest.service 捕获并记进 EventFeed.last_error，不打断其它源。 */
  fetch: (feed: ConnectorFeed) => Promise<RawSignal[]>;
}
