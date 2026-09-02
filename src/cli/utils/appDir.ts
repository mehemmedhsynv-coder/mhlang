import { existsSync } from "node:fs";
import path from "node:path";

/** Detects the Next.js App Router directory ("src/app" or "app"), or null if neither exists yet. */
export function detectAppDir(cwd: string): string | null {
  if (existsSync(path.join(cwd, "src", "app"))) return "src/app";
  if (existsSync(path.join(cwd, "app"))) return "app";
  return null;
}

/** Converts an absolute path (no extension) into a relative import specifier from `fromDir`. */
export function toImportSpecifier(fromDir: string, toPathNoExt: string): string {
  const rel = path.relative(fromDir, toPathNoExt).split(path.sep).join("/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}
