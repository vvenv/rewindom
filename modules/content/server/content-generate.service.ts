import {
  getFileStorageProvider,
  getLlmClient,
  resolveLlmConfig,
} from "@rewindom/module-sdk/server";

import {
  CONTENT_BODY_MAX_LENGTH,
  CONTENT_TITLE_MAX_LENGTH,
} from "./content.util.js";

import {
  splitTagValue,
  type ContentAssetKind,
  type ContentBriefEntry,
  type ContentFormat,
  type ContentOutputRules,
  type ContentTemplateSample,
} from "../shared/index.js";

const LLM_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const LLM_IMAGE_MAX_COUNT = 8;

/**
 * 体裁基础提示：只守两件租户改不得的事——JSON 输出契约，以及「不编造看不见的东西」。
 *
 * 风格上的数字（标题多长、几个标签）**不写在这里**，全部落到 `DEFAULT_OUTPUT_RULES`。
 * 写死在基础提示里的话，租户在模板里把标题定成 20 字，prompt 里就会同时出现
 * 「max 40」和「at most 20」两条矛盾指令，模型听哪条全看运气。
 */
const NOTE_SYSTEM_PROMPT = [
  "You write a short social note from the user's materials.",
  "Rules:",
  "- Only use facts visible in the provided text and images. Do not invent specifics from videos you cannot see.",
  "- Match the language of the provided materials.",
  "- Keep the note scannable: short paragraphs, concrete details, a natural voice.",
  "- Do not mention that you are an AI, or that images/videos were uploaded.",
  "",
  "Respond with JSON only:",
  '{"title": string, "body": string, "tags": string[]}',
  "- title: no hashtags.",
  "- body: the note, with the hashtags on their own last line, like #tag.",
  "- tags: the same hashtags, without the # prefix.",
].join("\n");

const ARTICLE_SYSTEM_PROMPT = [
  "You write a long-form article from the user's materials.",
  "Rules:",
  "- Only use facts visible in the provided text and images. Do not invent specifics from videos you cannot see.",
  "- Match the language of the provided materials.",
  "- Use Markdown with a clear structure: short introduction, H2 sections, closing.",
  "- Do not mention that you are an AI, or that images/videos were uploaded.",
  "",
  "Respond with JSON only:",
  '{"title": string, "body": string, "tags": string[]}',
  "- body: Markdown article body without repeating the title as an H1.",
  "- tags: optional topic keywords without #.",
].join("\n");

/** 模板没定的那几项落到这里——与拆分模板之前的行为一致。 */
const DEFAULT_OUTPUT_RULES: Record<ContentFormat, ContentOutputRules> = {
  note: {
    title_max: 40,
    body_min: 0,
    body_max: 0,
    hashtag_min: 3,
    hashtag_max: 8,
    tone: "",
  },
  article: {
    title_max: 60,
    body_min: 0,
    body_max: 0,
    hashtag_min: 0,
    hashtag_max: 0,
    tone: "",
  },
};

/**
 * 模板里喂给模型的那三样。字段表不在这里——它已经在 `entries` 上体现成
 * 「标签：值」了，再把 schema 也塞进 prompt 只是重复。
 */
export interface GenerateContentTemplate {
  guidelines: string;
  output_rules: ContentOutputRules;
  samples: ContentTemplateSample[];
}

/**
 * 组装 system prompt：**体裁基础提示 + 模板写作规则 + 输出约束 + 范文**。
 *
 * 基础那一段租户改不到——JSON 输出契约和「不编造看不到的视频内容」被改坏，
 * 整条生成链路会失败或开始瞎编，那不是租户该承担的后果。
 */
export function buildSystemPrompt(
  format: ContentFormat,
  template: GenerateContentTemplate | null,
): string {
  const parts = [
    format === "article" ? ARTICLE_SYSTEM_PROMPT : NOTE_SYSTEM_PROMPT,
  ];

  const guidelines = template?.guidelines.trim();
  if (guidelines) {
    parts.push(
      [
        "The team's writing rules for this kind of piece. Follow them over the generic guidance above:",
        guidelines,
      ].join("\n"),
    );
  }

  const constraints = outputConstraintLines(
    mergeOutputRules(format, template?.output_rules),
  );
  if (constraints.length > 0) {
    parts.push(["Hard requirements:", ...constraints].join("\n"));
  }

  const samples = template?.samples ?? [];
  if (samples.length > 0) {
    parts.push(
      [
        "Reference pieces from this team. Match their voice, rhythm and structure.",
        "Never reuse their facts, numbers or subject matter — only their style.",
        ...samples.map((sample, index) =>
          [
            `Example ${index + 1}${sample.title ? ` — ${sample.title}` : ""}:`,
            sample.body,
          ].join("\n"),
        ),
      ].join("\n\n"),
    );
  }

  return parts.join("\n\n");
}

/** 模板里为 0 的项（= 不限）落回体裁默认，不是「真的不限」。 */
function mergeOutputRules(
  format: ContentFormat,
  rules: ContentOutputRules | undefined,
): ContentOutputRules {
  const base = DEFAULT_OUTPUT_RULES[format];
  if (!rules) return base;
  return {
    title_max: rules.title_max || base.title_max,
    body_min: rules.body_min || base.body_min,
    body_max: rules.body_max || base.body_max,
    hashtag_min: rules.hashtag_min || base.hashtag_min,
    hashtag_max: rules.hashtag_max || base.hashtag_max,
    tone: rules.tone.trim() || base.tone,
  };
}

function outputConstraintLines(rules: ContentOutputRules): string[] {
  const lines: string[] = [];
  // 0 一律表示「不限」，省得为每一项再存一个 enabled 布尔
  if (rules.title_max > 0) {
    lines.push(`- Title: at most ${rules.title_max} characters.`);
  }
  if (rules.body_min > 0 && rules.body_max > 0) {
    lines.push(
      `- Body length: between ${rules.body_min} and ${rules.body_max} characters.`,
    );
  } else if (rules.body_min > 0) {
    lines.push(`- Body length: at least ${rules.body_min} characters.`);
  } else if (rules.body_max > 0) {
    lines.push(`- Body length: at most ${rules.body_max} characters.`);
  }
  if (rules.hashtag_max > 0) {
    lines.push(
      rules.hashtag_min > 0
        ? `- Hashtags: ${rules.hashtag_min} to ${rules.hashtag_max}.`
        : `- Hashtags: at most ${rules.hashtag_max}.`,
    );
  } else if (rules.hashtag_min > 0) {
    lines.push(`- Hashtags: at least ${rules.hashtag_min}.`);
  }
  if (rules.tone.trim()) {
    lines.push(`- Voice: ${rules.tone.trim()}.`);
  }
  return lines;
}

export interface GeneratedContent {
  title: string;
  body: string;
  tags: string[];
}

export interface GenerateContentSource {
  format: ContentFormat;
  /** 按模板字段填好的一份，自描述；没有模板时是空数组。 */
  entries: ContentBriefEntry[];
  template: GenerateContentTemplate | null;
  assets: Array<{
    kind: ContentAssetKind;
    filename: string;
    mime_type: string;
    text_body: string | null;
    storage_key: string | null;
  }>;
}

export function parseGeneratedContent(raw: string): GeneratedContent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("invalid_json");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid_json");
  }
  const record = parsed as {
    title?: unknown;
    body?: unknown;
    tags?: unknown;
  };
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const body = typeof record.body === "string" ? record.body.trim() : "";
  if (!title || !body) {
    throw new Error("missing_fields");
  }
  const tags = Array.isArray(record.tags)
    ? record.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.replace(/^#/u, "").trim())
        .filter((tag) => tag.length > 0)
        .slice(0, 12)
    : [];

  return {
    title: title.slice(0, CONTENT_TITLE_MAX_LENGTH),
    body: body.slice(0, CONTENT_BODY_MAX_LENGTH),
    tags,
  };
}

export async function generateContentFromSources(
  tenantId: string,
  source: GenerateContentSource,
): Promise<GeneratedContent> {
  const llm = await resolveLlmConfig(tenantId);
  if (!llm.apiKey.trim()) {
    const error = new Error("llm_not_configured");
    error.name = "LlmNotConfiguredError";
    throw error;
  }

  const client = getLlmClient(llm, { maxRetries: 0 });
  const userContent = await buildUserContent(source);
  const completion = await client.chat.completions.create({
    model: llm.model,
    temperature: llm.temperature,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(source.format, source.template),
      },
      { role: "user", content: userContent },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  return parseGeneratedContent(raw);
}

type UserContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

async function buildUserContent(
  source: GenerateContentSource,
): Promise<string | UserContentPart[]> {
  const lines: string[] = [];
  // 按模板字段逐条给，而不是拼成一段话：标签本身就是给模型的结构信号
  for (const entry of source.entries) {
    if (!entry.value.trim()) continue;
    lines.push(`${entry.label || entry.id}:\n${formatEntryValue(entry)}`);
  }

  const textAssets = source.assets.filter((asset) => asset.kind === "text");
  for (const [index, asset] of textAssets.entries()) {
    const label = asset.filename || `text-${index + 1}`;
    lines.push(`Text material (${label}):\n${asset.text_body?.trim() ?? ""}`);
  }

  const videos = source.assets.filter((asset) => asset.kind === "video");
  if (videos.length > 0) {
    lines.push(
      `The user also attached ${videos.length} video(s): ${videos
        .map((asset) => asset.filename || "video")
        .join(", ")}. You cannot watch them. Do not invent visual details.`,
    );
  }

  const images = source.assets.filter((asset) => asset.kind === "image");
  const imageParts: UserContentPart[] = [];
  for (const asset of images.slice(0, LLM_IMAGE_MAX_COUNT)) {
    if (!asset.storage_key) continue;
    const dataUrl = await readImageDataUrl(asset.storage_key, asset.mime_type);
    if (dataUrl) {
      imageParts.push({ type: "image_url", image_url: { url: dataUrl } });
    }
  }

  const text = lines.join("\n\n") || "Create a piece from the attached images.";
  if (imageParts.length === 0) {
    return text;
  }
  return [{ type: "text", text }, ...imageParts];
}

/** 标签类字段拆开成列表，模型比读一串逗号更容易照着用。 */
function formatEntryValue(entry: ContentBriefEntry): string {
  const tags = splitTagValue(entry.value);
  return tags.length > 1
    ? tags.map((tag) => `- ${tag}`).join("\n")
    : entry.value.trim();
}

async function readImageDataUrl(
  storageKey: string,
  mimeType: string,
): Promise<string | null> {
  const object = await getFileStorageProvider().open(storageKey);
  if (!object) {
    return null;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of object.stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > LLM_IMAGE_MAX_BYTES) {
      object.stream.destroy();
      return null;
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) {
    return null;
  }
  const mime = mimeType || "image/jpeg";
  return `data:${mime};base64,${Buffer.concat(chunks).toString("base64")}`;
}
