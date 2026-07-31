import { randomBytes } from "node:crypto";
import { mkdir, rename } from "node:fs/promises";
import { basename, join } from "node:path";


import {
  handleRouteError,
  handleValidationError,
  sendCodedError,
} from "@be-water/server-kernel/http/route-error-handler.js";
import { config } from "@be-water/server-kernel/lib/config.js";
import {
  DATABASE_RESTORE_MAX_FILE_BYTES,
  formatMaxUploadSize,
} from "@be-water/server-kernel/lib/upload-limits.js";
import { BACKUP_FILE_PREFIX, success } from "@be-water/shared";

import {
  getDatabaseBackupJobForUser,
  startDatabaseBackupBackgroundJob,
  startDatabaseRestoreBackgroundJob,
} from "../background-jobs/job-exports.js";
import { parseTitle, type JobIdParams } from "../lib/platform.types.js";
import {
  buildDatabaseBackupContentDisposition,
  consumeDatabaseBackupDownloadToken,
  createDatabaseBackupDownloadToken,
  openDatabaseBackupFileStream,
} from "../services/backup-download.service.js";
import {
  listLocalRestoreCandidates,
  resolveAllowedLocalRestorePath,
} from "../services/backup-path.service.js";
import { getDatabaseBackupDir } from "../services/backup.service.js";


// 插件由 apps/server 注册，这里只借它对 FastifyRequest/FastifyInstance 的类型增强
// （isMultipart / saveRequestFiles / tmpUploads / multipartErrors）。
import type {} from "@fastify/multipart";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/** 上游只提供整库备份；租户数据级备份是业务感知能力，留在下游产品仓。 */
async function getBackupDownloadJobForUser(
  jobId: string,
  userId: string,
): Promise<Awaited<ReturnType<typeof getDatabaseBackupJobForUser>>> {
  return getDatabaseBackupJobForUser(jobId, userId);
}

export async function registerBackupRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post<{ Body: { title?: unknown } }>(
    "/database-backup",
    async (request, reply: FastifyReply) => {
      try {
        const { userId, username } = request.authUser!;
        const title = parseTitle(request.body?.title, "数据备份");

        const result = await startDatabaseBackupBackgroundJob(
          userId,
          username,
          title,
          request.log,
        );

        if (result === "misconfigured") {
          return sendCodedError(reply, 500, "platform.database_url_missing");
        }

        return reply.code(202).send(success(result));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 启动数据库备份失败",
          "START_DATABASE_BACKUP_FAILED",
        );
      }
    },
  );

  app.post<{ Params: JobIdParams }>(
    "/backup/jobs/:job_id/download-token",
    async (request, reply) => {
      try {
        const { userId } = request.authUser!;
        const { job_id } = request.params;

        const job = await getBackupDownloadJobForUser(job_id, userId);
        if (!job) {
          return sendCodedError(reply, 404, "job.not_found");
        }

        if (job.status !== "success" || !job.result) {
          return sendCodedError(reply, 409, "platform.backup_not_ready");
        }

        try {
          await openDatabaseBackupFileStream(job_id);
        } catch {
          return sendCodedError(reply, 404, "platform.backup_missing_or_expired");
        }

        const download_token = await createDatabaseBackupDownloadToken(
          job_id,
          userId,
        );
        return reply.send(success({ download_token }));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 创建备份下载令牌失败",
          "CREATE_BACKUP_DOWNLOAD_TOKEN_FAILED",
        );
      }
    },
  );

  app.get<{
    Params: JobIdParams;
    Querystring: { download_token?: string };
  }>("/backup/jobs/:job_id/download", async (request, reply) => {
    try {
      const { job_id } = request.params;
      let userId: string;

      const downloadToken = request.query.download_token?.trim();
      if (downloadToken) {
        const payload = await consumeDatabaseBackupDownloadToken(
          downloadToken,
          job_id,
        );
        if (!payload) {
          return sendCodedError(reply, 401, "platform.backup_download_invalid");
        }
        userId = payload.user_id;
      } else {
        userId = request.authUser!.userId;
      }

      const job = await getBackupDownloadJobForUser(job_id, userId);
      if (!job) {
        return sendCodedError(reply, 404, "job.not_found");
      }

      if (job.status !== "success" || !job.result) {
        return sendCodedError(reply, 409, "platform.backup_not_ready");
      }

      try {
        const { stream, size, contentType } =
          await openDatabaseBackupFileStream(job_id);
        const exportResult = job.result as { filename?: string };
        const filename =
          typeof exportResult.filename === "string"
            ? exportResult.filename
            : `${BACKUP_FILE_PREFIX}_backup_${job_id}.dump`;

        reply.header("Content-Type", contentType);
        reply.header(
          "Content-Disposition",
          buildDatabaseBackupContentDisposition(filename),
        );
        reply.header("Content-Length", String(size));
        return reply.send(stream);
      } catch {
        return sendCodedError(reply, 404, "platform.backup_missing_or_expired");
      }
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformRoutes] 下载备份失败",
        "DOWNLOAD_BACKUP_FAILED",
      );
    }
  });

  app.post("/restore", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId, username } = request.authUser!;

      if (!config.database.url) {
        return sendCodedError(reply, 500, "platform.database_url_missing");
      }

      if (!request.isMultipart()) {
        return handleValidationError(reply, "common.file_required");
      }

      const uploadTmpDir = join(getDatabaseBackupDir(), ".tmp");
      await mkdir(uploadTmpDir, { recursive: true });
      const { files } = await request.saveRequestFiles({
        limits: { fileSize: DATABASE_RESTORE_MAX_FILE_BYTES },
        tmpdir: uploadTmpDir,
      });
      const uploaded = files[0];
      if (!uploaded?.filepath) {
        return handleValidationError(reply, "common.file_required");
      }

      const originalFilename = uploaded.filename || "backup.dump";
      const stagingPath = join(
        uploadTmpDir,
        `restore-upload-${randomBytes(8).toString("hex")}.dump`,
      );
      await rename(uploaded.filepath, stagingPath);
      if (request.tmpUploads) {
        const index = request.tmpUploads.indexOf(uploaded.filepath);
        if (index >= 0) {
          request.tmpUploads.splice(index, 1);
        }
      }
      await request.cleanRequestFiles();

      const result = await startDatabaseRestoreBackgroundJob(
        userId,
        username,
        stagingPath,
        originalFilename,
        { deleteSourceAfterRestore: true },
        request.log,
      );

      return reply.code(202).send(success(result));
    } catch (err) {
      const { RequestFileTooLargeError } = request.server.multipartErrors;
      if (err instanceof RequestFileTooLargeError) {
        return reply.code(413).send({
          error: `备份文件过大，最大支持 ${formatMaxUploadSize(DATABASE_RESTORE_MAX_FILE_BYTES)}`,
          code: "FILE_TOO_LARGE",
        });
      }

      return handleRouteError(
        reply,
        err,
        "[platformRoutes] 启动数据库还原失败",
        "START_DATABASE_RESTORE_FAILED",
      );
    }
  });

  app.get("/restore/local-candidates", async (_request, reply) => {
    try {
      const candidates = await listLocalRestoreCandidates();
      return reply.send(success({ candidates }));
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformRoutes] 列出本地备份文件失败",
        "LIST_LOCAL_RESTORE_CANDIDATES_FAILED",
      );
    }
  });

  app.post<{ Body: { file_path?: unknown } }>(
    "/restore/local",
    async (request, reply) => {
      try {
        const { userId, username } = request.authUser!;

        if (!config.database.url) {
          return sendCodedError(reply, 500, "platform.database_url_missing");
        }

        const rawPath = request.body?.file_path;
        if (typeof rawPath !== "string" || !rawPath.trim()) {
          return handleValidationError(reply, "platform.backup_path_required");
        }

        const resolvedPath = await resolveAllowedLocalRestorePath(
          rawPath.trim(),
        );
        const result = await startDatabaseRestoreBackgroundJob(
          userId,
          username,
          resolvedPath,
          basename(resolvedPath),
          { deleteSourceAfterRestore: false },
          request.log,
        );

        return reply.code(202).send(success(result));
      } catch (err) {
        if (err instanceof Error && !("statusCode" in err)) {
          return sendCodedError(reply, 400, "platform.path_not_file");
        }
        return handleRouteError(
          reply,
          err,
          "[platformRoutes] 启动本地路径还原失败",
          "START_LOCAL_DATABASE_RESTORE_FAILED",
        );
      }
    },
  );
}
