/**
 * 内容源注册表 —— **本模块与内容之间唯一的接缝**。
 *
 * 注册表定义在**消费方**（这里），贡献方来填。events 在 `onBoot` 里把自己的主题
 * 登记成可订阅列表并实现取数，newsletter 拿到的只是一串 `list_key` 和一堆
 * `{ title, url, summary, published_at }`——它永远不认识 events。
 * 依赖方向单向：`events → newsletter`。
 *
 * 与 marketing 的 `registerSiteSectionHtml`、site-member 的 member-menu-links 同形。
 *
 * **拉，不推。** 摘要天然是拉：定时问 source「游标之后有什么」。推模式（贡献方发
 * EventBus 事件、本模块订阅）三条都不成立——每条内容一封信；EventBus 的约定是
 * 「Handler 失败不阻塞发布方」，失败即丢信；补发和重放做不了。
 */

/** 可订阅列表。`list_key` 建议带模块前缀（`events:topic:ai`），避免撞车。 */
export interface NewsletterList {
  /** 建议带模块前缀（`events:topic:ai`），避免撞车。 */
  list_key: string;
  label: string;
  description?: string;
  /**
   * 值里含 `{token}`、要按当前页面插值才成立的候选（如「当前主题」）。
   *
   * 它只进编辑器下拉，**不进「本站全部」的解析结果**——没有页面上下文时那个 key
   * 根本解不开，订上去等于订了一个永远不会有内容的列表。
   */
  dynamic?: boolean;
  /**
   * 这个源在界面上叫什么（已是当前语言）。贡献方填。
   *
   * 只在**站点接了多于一个源**时才会显示出来——见 `buildListOptions`。
   */
  source_label?: string;
  /** 贡献方不用管：由 `listAvailableLists` 按产出它的源回填。 */
  source_id?: string;
}

/**
 * 下拉候选。**只有源多于一个时才把来源写进标签。**
 *
 * 单源站点（目前唯一的情形）保持干净：给每一项都盖一句「事件雷达」是一行废话。
 * 但第二个源接进来的那一刻，来源就必须看得见——`list_key` 前缀
 *（`events:topic:business`）不显示在界面上，两个源各有一个叫「商业」的列表时，
 * 下拉里**完全无法区分**，租户选错了读者就收到一堆没订的东西。
 *
 * 之所以不做真正的 `<SelectGroup>` 分组：那要改 marketing 内核两处，而收益
 *（长列表扫读）只有在「多个源 × 每个源几十项」时才明显——那个规模现在还不存在。
 */
export function buildListOptions(
  lists: readonly NewsletterList[],
): { value: string; label: string }[] {
  const sources = new Set(lists.map((list) => list.source_id ?? ""));
  const showSource = sources.size > 1;
  return lists.map((list) => ({
    value: list.list_key,
    label:
      showSource && (list.source_label || list.source_id)
        ? `${list.source_label || list.source_id} · ${list.label}`
        : list.label,
  }));
}

/** 摘要里的一条。中立结构——本模块不认识它从哪来。 */
export interface NewsletterItem {
  /** 贡献方侧的稳定 id，用于排错对账；本模块不做去重依据（去重靠游标）。 */
  id: string;
  title: string;
  /**
   * 站内相对路径（`/events/foo`）或绝对地址。
   *
   * 邮件里没有 base，相对路径直接死——但**绝对化由本模块负责**（它已经为了确认信
   * 解析过站点 origin）。内容源不该被迫去认识站点的公开地址是什么。
   */
  url: string;
  summary?: string;
  /** ISO 串。 */
  published_at: string;
}

export interface NewsletterItemsResult {
  items: NewsletterItem[];
  /** 传回下一轮的游标；`null` 表示没有更多了。 */
  next_cursor: string | null;
}

export interface NewsletterSource {
  /** 贡献方 id，用于日志与排错。 */
  readonly id: string;

  /**
   * 这个站点有哪些东西可订。
   *
   * 数量要可控——它会进订阅段的下拉框。几千个候选的维度（比如实体）应当
   * **不进清单但仍能取数**：段可以按上下文把 key 填进去。
   */
  listLists(input: {
    tenant_id: string;
    locale: string;
  }): Promise<NewsletterList[]>;

  /** 认不认得这个 key。清单之外的 key 靠它放行。 */
  ownsList(list_key: string): boolean;

  /**
   * 这个 key 给人看叫什么。
   *
   * **和 `listLists` 是两件事**：清单是给编辑器下拉用的、数量必须可控（实体有几千个，
   * 刻意不进清单）；而 `/subscribe?list=events:entity:openai` 这种链接照样要在页面上
   * 告诉读者「你正在订阅 OpenAI」——不然他看到的是一串裸 key。
   *
   * 认不出来返回 null，调用方自己兜底。
   */
  describeList(input: {
    tenant_id: string;
    list_key: string;
    locale: string;
  }): Promise<string | null>;

  /** 游标之后的新条目。`limit` 必须被尊重，贡献方自己再夹一层硬上限。 */
  listItemsSince(input: {
    tenant_id: string;
    list_key: string;
    locale: string;
    cursor: string | null;
    limit: number;
  }): Promise<NewsletterItemsResult>;
}

/*
 * 进程级注册表。与 marketing 的段注册表同构：模块 onBoot 时登记，
 * 之后只读。列表而非单值——内容天然来自多个域，后注册的不该顶掉先注册的。
 */
const sources: NewsletterSource[] = [];

export function registerNewsletterSource(source: NewsletterSource): void {
  if (sources.some((existing) => existing.id === source.id)) return;
  sources.push(source);
}

export function listNewsletterSources(): readonly NewsletterSource[] {
  return sources;
}

/** 谁认领这个 key。没人认领返回 null——列表被下线时会走到这里。 */
export function findNewsletterSource(
  list_key: string,
): NewsletterSource | null {
  return sources.find((source) => source.ownsList(list_key)) ?? null;
}

/** 仅供测试：清空注册表。 */
export function resetNewsletterSources(): void {
  sources.length = 0;
}
