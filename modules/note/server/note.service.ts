import {
  resolveSortField,
  resolveSortOrder,
  NotFoundError,
  ValidationError,
  prisma,
  withTenantScope,
} from "@be-water/module-sdk/server";

import { toNote, toNoteListItem } from "./note.mapper.js";
import { validateNoteInput } from "./note.util.js";

import type { Note, NoteListItem } from "../shared/index.js";

export interface ListNotesParams {
  tenant_id: string;
  page: number;
  page_size: number;
  q?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

const NOTE_SORTABLE_FIELDS = new Set(["title", "updated_at", "created_at"]);

function buildNoteOrderBy(
  sortBy?: string,
  sortDir?: "asc" | "desc",
): { title: "asc" | "desc" } | { updated_at: "asc" | "desc" } | { created_at: "asc" | "desc" } {
  const field = resolveSortField(sortBy, NOTE_SORTABLE_FIELDS, "updated_at");
  const order = resolveSortOrder(sortDir, "desc");
  return { [field]: order } as
    | { title: "asc" | "desc" }
    | { updated_at: "asc" | "desc" }
    | { created_at: "asc" | "desc" };
}

export interface ListNotesResult {
  items: NoteListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

function buildNoteListWhere(
  tenant_id: string,
  q?: string,
): ReturnType<typeof withTenantScope> {
  return withTenantScope(tenant_id, {
    ...(q?.trim()
      ? {
          OR: [
            { title: { contains: q.trim(), mode: "insensitive" as const } },
            { content: { contains: q.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
  });
}

export async function listNotes(params: ListNotesParams): Promise<ListNotesResult> {
  const { tenant_id, page, page_size, q, sort_by, sort_dir } = params;
  const skip = (page - 1) * page_size;

  const [records, total] = await Promise.all([
    prisma.note.findMany({
      where: buildNoteListWhere(tenant_id, q),
      orderBy: buildNoteOrderBy(sort_by, sort_dir),
      skip,
      take: page_size,
    }),
    prisma.note.count({ where: buildNoteListWhere(tenant_id, q) }),
  ]);

  return {
    items: records.map(toNoteListItem),
    page,
    page_size,
    total,
    page_count: Math.ceil(total / page_size),
  };
}

export async function getNote(
  tenant_id: string,
  note_id: string,
): Promise<Note> {
  const record = await prisma.note.findFirst({
    where: withTenantScope(tenant_id, { id: note_id }),
  });
  if (!record) {
    throw new NotFoundError("note.not_found");
  }
  return toNote(record);
}

export async function createNote(params: {
  tenant_id: string;
  user_id: string;
  title: string;
  content?: string;
}): Promise<Note> {
  const validationError = validateNoteInput({
    title: params.title,
    content: params.content,
  });
  if (validationError) {
    throw new ValidationError(validationError.code, validationError.params);
  }

  const record = await prisma.note.create({
    data: {
      tenant_id: params.tenant_id,
      title: params.title.trim(),
      content: params.content?.trim() ?? "",
      created_by: params.user_id,
    },
  });

  return toNote(record);
}

export async function updateNote(params: {
  tenant_id: string;
  user_id: string;
  note_id: string;
  title?: string;
  content?: string;
}): Promise<Note> {
  const validationError = validateNoteInput(
    { title: params.title, content: params.content },
    { requireTitle: params.title !== undefined },
  );
  if (validationError) {
    throw new ValidationError(validationError.code, validationError.params);
  }

  const existing = await prisma.note.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.note_id }),
  });
  if (!existing) {
    throw new NotFoundError("note.not_found");
  }

  // 归属校验并进 where：上面的 findFirst 负责给出 404，
  // 这里再带一次租户谓词，使「校验」与「写入」落在同一条语句里，
  // 不给并发改租户之类的时间窗留空隙。
  const record = await prisma.note.update({
    where: withTenantScope(params.tenant_id, { id: params.note_id }),
    data: {
      ...(params.title !== undefined ? { title: params.title.trim() } : {}),
      ...(params.content !== undefined
        ? { content: params.content.trim() }
        : {}),
      updated_by: params.user_id,
    },
  });

  return toNote(record);
}

export async function deleteNote(
  tenant_id: string,
  note_id: string,
): Promise<void> {
  const existing = await prisma.note.findFirst({
    where: withTenantScope(tenant_id, { id: note_id }),
  });
  if (!existing) {
    throw new NotFoundError("note.not_found");
  }

  // 同 updateNote：租户谓词并进 delete 自身，避免 check-then-act 的时间窗。
  await prisma.note.delete({
    where: withTenantScope(tenant_id, { id: note_id }),
  });
}
