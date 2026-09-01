import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PlannedFile } from "./plan.js";

export interface ConflictCheckResult {
  hasConflicts: boolean;
  /** Relative paths (within the target dir) of files that already exist on disk. */
  existingFiles: string[];
}

function toAbsolutePath(targetDir: string, relativePath: string): string {
  return path.join(targetDir, ...relativePath.split("/"));
}

/** Checks which of the planned files already exist on disk, without modifying anything. */
export async function findExistingFiles(
  targetDir: string,
  files: readonly PlannedFile[]
): Promise<ConflictCheckResult> {
  const existingFiles: string[] = [];
  for (const file of files) {
    try {
      await access(toAbsolutePath(targetDir, file.relativePath));
      existingFiles.push(file.relativePath);
    } catch {
      // File does not exist — nothing to report.
    }
  }
  return { hasConflicts: existingFiles.length > 0, existingFiles };
}

/** Writes all planned files to disk, creating directories as needed. Returns the written paths. */
export async function writeFiles(targetDir: string, files: readonly PlannedFile[]): Promise<string[]> {
  const written: string[] = [];
  for (const file of files) {
    const absolutePath = toAbsolutePath(targetDir, file.relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.content, "utf8");
    written.push(file.relativePath);
  }
  return written;
}
