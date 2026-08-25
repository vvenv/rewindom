import {
  getFileStorageProvider,
  getLlmClient,
  resolveLlmConfig,
} from "@rewindom/module-sdk/server";

import {
  CONTENT_BODY_MAX_LENGTH,
  CONTENT_TITLE_MAX_LENGTH,
} from "./content.util.js";

import type { ContentAssetKind, ContentFormat } from "../shared/index.js";

const LLM_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const LLM_IMAGE_MAX_COUNT = 8;

const NOTE_SYSTEM_PROMPT = [
  "You write a short social note from the user's materials.",
  "Rules:",
  "- Only use facts visible in the provided text and images. Do not invent specifics from videos you cannot see.",
  "- Match the language of the brief and text materials.",
  "- Keep the note scannable: short paragraphs, concrete details, a natural voice.",
  "- End with 3 to 8 hashtags on their own last line, like #tag.",
  "- Do not mention that you are an AI, or that images/videos were uploaded.",
  "",
  "Respond with JSON only:",
  '{"title": string, "body": string, "tags": string[]}',
  "- title: max 40 characters, no hashtags.",
  "- body: the note, including the hashtag line.",
  "- tags: hashtags without the # prefix.",
].join("\n");

const ARTICLE_SYSTEM_PROMPT = [
  "You write a long-form article from the user's materials.",
  "Rules:",
  "- Only use facts visible in the provided text and images. Do not invent specifics from videos you cannot see.",
  "- Match the language of the brief and text materials.",
  "- Use Markdown with a clear structure: short introduction, H2 sections, closing.",
  "- Do not mention that you are an AI, or that images/videos were uploaded.",
  "",
  "Respond with JSON only:",
  '{"title": string, "body": string, "tags": string[]}',
  "- title: max 60 characters.",
  "- body: Markdown article body without repeating the title as an H1.",
  "- tags: optional topic keywords without #.",
].join("\n");

export interface GeneratedContent {
  title: string;
  body: string;
  tags: string[];
}

export interface GenerateContentSource {
  format: ContentFormat;
  brief: string;
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
        content:
          source.format === "article"
            ? ARTICLE_SYSTEM_PROMPT
            : NOTE_SYSTEM_PROMPT,
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
  if (source.brief.trim()) {
    lines.push(`Brief:\n${source.brief.trim()}`);
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
