import type { FastifyRequest } from "fastify";

export interface ParsedMultipartFileUpload {
  buffer: Buffer;
  mimetype: string;
  filename: string | undefined;
  fields: Record<string, string>;
}

export type ParsedMultipartFileItem = Omit<ParsedMultipartFileUpload, "fields">;

export interface ParsedMultipartFilesUpload {
  files: ParsedMultipartFileItem[];
  fields: Record<string, string>;
}

export async function parseMultipartFileUpload(
  request: FastifyRequest,
): Promise<ParsedMultipartFileUpload | null> {
  const parsed = await parseMultipartFileUploads(request);
  if (!parsed || parsed.files.length === 0) {
    return null;
  }
  return {
    ...parsed.files[0],
    fields: parsed.fields,
  };
}

export async function parseMultipartFileUploads(
  request: FastifyRequest,
): Promise<ParsedMultipartFilesUpload | null> {
  if (!request.isMultipart()) {
    return null;
  }

  const fields: Record<string, string> = {};
  const files: ParsedMultipartFileItem[] = [];

  for await (const part of request.parts()) {
    if (part.type === "file") {
      files.push({
        buffer: await part.toBuffer(),
        mimetype: part.mimetype,
        filename: part.filename,
      });
      continue;
    }

    if (typeof part.value === "string") {
      fields[part.fieldname] = part.value;
    }
  }

  if (files.length === 0) {
    return null;
  }

  return { files, fields };
}
