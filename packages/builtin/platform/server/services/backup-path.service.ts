import { realpath, readdir, stat } from "node:fs/promises";
import path, { basename } from "node:path";

import {
  NotFoundError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { config } from "@be-water/server-kernel/lib/config.js";

import { assertCustomDumpFile } from "./backup.service.js";

export interface LocalRestoreCandidate {
  file_path: string;
  filename: string;
  size_bytes: number;
  modified_at: number;
}

export function getDatabaseRestoreLocalPaths(): readonly string[] {
  return config.database.restore.localPaths;
}

export async function resolveAllowedLocalRestorePath(
  filePath: string,
): Promise<string> {
  const trimmed = filePath.trim();
  if (!trimmed) {
    throw new ValidationError("platform.backup_path_required");
  }
  if (!path.isAbsolute(trimmed)) {
    throw new ValidationError("platform.backup_path_absolute");
  }

  const allowedRoots = (
    await Promise.all(
      getDatabaseRestoreLocalPaths().map(async (root) => {
        try {
          return await realpath(root);
        } catch {
          return null;
        }
      }),
    )
  ).filter((root): root is string => root != null);

  if (allowedRoots.length === 0) {
    throw new ValidationError("platform.restore_paths_missing");
  }

  let resolved: string;
  try {
    resolved = await realpath(trimmed);
  } catch {
    throw new NotFoundError("platform.backup_missing_or_expired");
  }

  const isAllowed = allowedRoots.some(
    (root) => resolved === root || resolved.startsWith(`${root}${path.sep}`),
  );
  if (!isAllowed) {
    throw new ValidationError("platform.backup_path_not_allowed");
  }

  const fileStat = await stat(resolved);
  if (!fileStat.isFile()) {
    throw new ValidationError("platform.path_not_file");
  }

  await assertCustomDumpFile(resolved);
  return resolved;
}

export async function listLocalRestoreCandidates(): Promise<
  LocalRestoreCandidate[]
> {
  const candidates: LocalRestoreCandidate[] = [];

  for (const root of getDatabaseRestoreLocalPaths()) {
    let resolvedRoot: string;
    try {
      resolvedRoot = await realpath(root);
    } catch {
      continue;
    }

    let entries: string[];
    try {
      entries = await readdir(resolvedRoot);
    } catch {
      continue;
    }

    for (const name of entries) {
      if (!name.endsWith(".dump")) {
        continue;
      }
      const filePath = path.join(resolvedRoot, name);
      try {
        const fileStat = await stat(filePath);
        if (!fileStat.isFile() || fileStat.size < 50) {
          continue;
        }
        candidates.push({
          file_path: filePath,
          filename: basename(filePath),
          size_bytes: fileStat.size,
          modified_at: fileStat.mtimeMs,
        });
      } catch {
        // skip unreadable entries
      }
    }
  }

  return candidates.sort((a, b) => b.modified_at - a.modified_at);
}
