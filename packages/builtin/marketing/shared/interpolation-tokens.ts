/**
 * `{token}` 的**注册表** —— 「这个站点上有哪些占位符」的唯一真相源。
 *
 * 以前一个 token 散在三处、彼此不认识：
 *
 * 1. `PageTemplateKindDefinition.interpolation_tokens` —— 一串**光秃的字符串**，
 *    编辑器拿它拼 tip，谁也说不出 `{topic_slug}` 是什么
 * 2. 模块的 `xxxInterpolationValues()` —— 真正填值的地方
 * 3. 没有第三处，而这正是问题：**没有任何东西把 1 和 2 对上**
 *
 * 后果是漂移不报错、只是悄悄少一项：events 填了七个 token，而实体索引那张模板一个都
 * 没声明——`{feed}` 在那张页面上明明可用，编辑器却不列，租户无从知道能写。反过来，
 * 声明了却没人填的 token 会让租户写下一个永远替不掉的花括号。
 *
 * 现在一个 token 一条声明，**由填值的那个模块登记**（在它登记 page template 的同一个
 * 函数里，server `onBoot` 与 client manifest 各调一次）。两份清单靠测试钉在一起：
 * 每个贡献方都有一条「登记的 key 集合 == values 函数的 key 集合」，多一个少一个都红。
 *
 * 语法与语义见 `site-interpolation.ts`——那边管**怎么替**，这边管**有哪些**。
 */

/** 一个占位符的声明。 */
export interface InterpolationTokenDefinition {
  /** token 名，**不带**花括号。 */
  key: string;
  /**
   * 「这是什么」的 i18n key，**一律带命名空间**（`marketing:editor.token.site`、
   * `events:token.topic`）——包括 marketing 自己的。
   *
   * 不省这个前缀是因为清单是**跨模块**渲染的：`t(token.label)` 那一处的当前 ns 是
   * marketing，裸 key 在那里碰巧能解析，于是「漏写 ns」这个错要等到贡献方的 token
   * 显示成一行原始 key 才被发现。带上 ns 还顺带让 `pnpm check:i18n` 认得出它
   *（它扫的是 `ns:key` 字面量），漏写文案在门禁上就红。
   *
   * 写给**租户**看，不是写给开发看：`{topic_slug}` 的说明是「当前专题的地址片段
   *（用于拼链接）」，不是「context.topic ?? event.topic」。
   */
  label: string;
  /**
   * 只在这些 page kind 上有值；不声明 = **每张页面都有**（内置那五个就是）。
   *
   * 摆在 token 这一侧而不是 page kind 那一侧：`{feed}` 同时长在首页、专题、详情、
   * 实体、实体索引五张模板上，写在 token 上是一行，写在 kind 上要抄五遍——而漏抄
   * 一遍正是实体索引丢掉 `{feed}` 的原因。
   */
  page_kinds?: readonly string[];
  /**
   * 贡献方的 entitlement；本站没开通就不列出。
   *
   * token 是**进程级**登记的（模块装进这个部署就有），开通与否是按租户的——
   * 与 section / chrome 块同一条闸门。
   */
  entitlement?: string;
}

const TOKENS = new Map<string, InterpolationTokenDefinition>();

/**
 * 登记一个占位符。在模块登记官网贡献的那个函数里调（与 page template 同一处）。
 *
 * 重复登记同一个对象是幂等的；**撞名会抛**——两个模块各填一个同名 token，
 * 渲染期后写的会把先写的盖掉，而租户看到的是「有时候对有时候不对」。
 */
export function registerInterpolationToken(
  definition: InterpolationTokenDefinition,
): void {
  const existing = TOKENS.get(definition.key);
  if (existing === definition) return;
  if (existing) {
    throw new Error(`site.interpolation_token_conflict:${definition.key}`);
  }
  TOKENS.set(definition.key, definition);
}

export function registerInterpolationTokens(
  definitions: readonly InterpolationTokenDefinition[],
): void {
  for (const definition of definitions) registerInterpolationToken(definition);
}

/** 仅供测试：清空贡献登记，内置项重新装回。 */
export function resetInterpolationTokens(): void {
  TOKENS.clear();
  registerInterpolationTokens(BUILTIN_INTERPOLATION_TOKENS);
}

/**
 * 内置占位符：全是「写进 settings 就会过期」的站点级值，每张页面都可用。
 *
 * 口径同 Hugo / Jekyll / Ghost，**一次给齐、不搞别名**——`{site_name}` / `{site_desc}` /
 * `{domain}` 都不认。同一个值两种写法，租户在编辑器里看见一份清单、在别处抄到另一份，
 * 谁都说不清哪个是对的。
 */
export const BUILTIN_INTERPOLATION_TOKENS: readonly InterpolationTokenDefinition[] =
  [
    { key: "year", label: "marketing:editor.token.year" },
    { key: "site", label: "marketing:editor.token.site" },
    { key: "tagline", label: "marketing:editor.token.tagline" },
    { key: "hostname", label: "marketing:editor.token.hostname" },
    { key: "url", label: "marketing:editor.token.url" },
  ];

registerInterpolationTokens(BUILTIN_INTERPOLATION_TOKENS);

/** 内置 token 的 key，按声明顺序。 */
export const BUILTIN_SITE_TOKENS: readonly string[] =
  BUILTIN_INTERPOLATION_TOKENS.map((token) => token.key);

/**
 * 这张页面上**实际可用**的占位符，内置在前、贡献在后（各自按登记顺序）。
 *
 * `pageKind` 不传按「站点级」算（页头 / 页脚：全站共用一份，不该列出只有详情页
 * 才有值的 `{event}`）。`entitlements` 不传等于一个贡献 token 都不列——方向与段的
 * 闸门一致：少列了是「没提示」，多列了是让租户写下一个永远替不掉的花括号。
 */
export function interpolationTokensFor(input: {
  pageKind?: string;
  entitlements?: ReadonlySet<string>;
}): InterpolationTokenDefinition[] {
  const out: InterpolationTokenDefinition[] = [];
  for (const token of TOKENS.values()) {
    if (token.entitlement && !input.entitlements?.has(token.entitlement)) {
      continue;
    }
    if (
      token.page_kinds &&
      (input.pageKind === undefined || !token.page_kinds.includes(input.pageKind))
    ) {
      continue;
    }
    out.push(token);
  }
  return out;
}

/** 编辑器提示用的一行：`{year} {site} {tagline} …`。 */
export function formatInterpolationTokens(
  tokens: readonly InterpolationTokenDefinition[],
): string {
  return tokens.map((token) => `{${token.key}}`).join(" ");
}
