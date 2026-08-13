import { prisma } from "@rewindom/module-sdk/server";

import { buildNoteContentPreview } from "./note.util.js";

import type { Note, NoteListItem } from "../shared/index.js";

/** 从 prisma 实例推导记录类型——无需直接 import 生成的 Prisma client 类型。 */
type NoteRecord = NonNullable<Awaited<ReturnType<typeof prisma.note.findFirst>>>;

export function toNoteListItem(record: NoteRecord): NoteListItem {
  return {
    id: record.id,
    title: record.title,
    content_preview: buildNoteContentPreview(record.content),
    created_by: record.created_by,
    updated_by: record.updated_by,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

export function toNote(record: NoteRecord): Note {
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    title: record.title,
    content: record.content,
    created_by: record.created_by,
    updated_by: record.updated_by,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}
