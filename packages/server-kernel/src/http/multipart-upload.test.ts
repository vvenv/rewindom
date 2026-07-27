import multipart from "@fastify/multipart";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { parseMultipartFileUpload } from "./multipart-upload.js";

function buildMultipartBody(
  boundary: string,
  parts: string[],
): { payload: string; contentType: string } {
  const payload =
    parts.map((part) => `--${boundary}\r\n${part}\r\n`).join("") +
    `--${boundary}--\r\n`;
  return {
    payload,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

describe("parseMultipartFileUpload", () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  async function parseBody(parts: string[]) {
    const app = Fastify();
    apps.push(app);
    await app.register(multipart);
    app.post("/", async (request) => {
      const parsed = await parseMultipartFileUpload(request);
      return {
        filename: parsed?.filename,
        mimetype: parsed?.mimetype,
        fields: parsed?.fields,
        bufferText: parsed?.buffer.toString(),
      };
    });

    const boundary = "test-boundary";
    const { payload, contentType } = buildMultipartBody(boundary, parts);
    const response = await app.inject({
      method: "POST",
      url: "/",
      headers: { "content-type": contentType },
      payload,
    });

    return response.json<{
      filename?: string;
      mimetype?: string;
      fields?: Record<string, string>;
      bufferText?: string;
    }>();
  }

  it("reads text fields that come after the file part", async () => {
    const parsed = await parseBody([
      'Content-Disposition: form-data; name="file"; filename="a.png"\r\nContent-Type: image/png\r\n\r\ndata',
      'Content-Disposition: form-data; name="entity_type"\r\n\r\norder',
      'Content-Disposition: form-data; name="entity_id"\r\n\r\n848149316293803',
      'Content-Disposition: form-data; name="field"\r\n\r\nnote',
    ]);

    expect(parsed).toMatchObject({
      filename: "a.png",
      mimetype: "image/png",
      fields: {
        entity_type: "order",
        entity_id: "848149316293803",
        field: "note",
      },
      bufferText: "data",
    });
  });

  it("reads text fields that come before the file part", async () => {
    const parsed = await parseBody([
      'Content-Disposition: form-data; name="field"\r\n\r\nnote',
      'Content-Disposition: form-data; name="file"; filename="a.png"\r\nContent-Type: image/png\r\n\r\ndata',
    ]);

    expect(parsed?.fields).toEqual({ field: "note" });
  });
});
