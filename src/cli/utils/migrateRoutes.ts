import { existsSync } from "node:fs";
import { mkdir, readdir, rename } from "node:fs/promises";
import path from "node:path";

/** App Router entries that must stay at the app root — never moved under `[locale]/`. */
const NEVER_MIGRATE = new Set([
  "layout.tsx",
  "layout.jsx",
  "layout.js",
  "global-error.tsx",
  "global-error.jsx",
  "global-error.js",
  "manifest.ts",
  "manifest.js",
  "sitemap.ts",
  "sitemap.js",
  "robots.ts",
  "robots.js",
  "robots.txt",
  "favicon.ico",
  "globals.css",
  "api",
  "[locale]",
]);

const ICON_CONVENTION_PATTERN = /^(icon|apple-icon|opengraph-image|twitter-image)(\.[a-z0-9]+)?$/i;

function isNeverMigrated(name: string): boolean {
  return NEVER_MIGRATE.has(name) || ICON_CONVENTION_PATTERN.test(name);
}

export interface MigrationCandidate {
  name: string;
  isDirectory: boolean;
}

/**
 * Lists top-level entries directly inside `appDir` that represent existing routes and should
 * move under `[locale]/` for URL-prefixed i18n to apply site-wide (e.g. `page.tsx`, `about/`,
 * a `(marketing)/` route group) — excluding root-only conventions like the root `layout.tsx`,
 * `api/`, icon/manifest files, and an already-migrated `[locale]/`.
 */
export async function findMigrationCandidates(appDir: string): Promise<MigrationCandidate[]> {
  if (!existsSync(appDir)) return [];
  const entries = await readdir(appDir, { withFileTypes: true });
  return entries
    .filter((entry) => !isNeverMigrated(entry.name))
    .map((entry) => ({ name: entry.name, isDirectory: entry.isDirectory() }));
}

/**
 * Moves each candidate from `appDir/<name>` to `appDir/[locale]/<name>`, preserving its internal
 * structure (a directory move carries everything nested inside it along, including its own
 * nested layouts/route groups). Returns the names that were skipped because a same-named entry
 * already exists at the destination — the caller should surface these, not silently drop them.
 */
export async function migrateRoutesIntoLocale(
  appDir: string,
  candidates: readonly MigrationCandidate[]
): Promise<{ moved: string[]; skipped: string[] }> {
  const localeDir = path.join(appDir, "[locale]");
  await mkdir(localeDir, { recursive: true });

  const moved: string[] = [];
  const skipped: string[] = [];

  for (const candidate of candidates) {
    const from = path.join(appDir, candidate.name);
    const to = path.join(localeDir, candidate.name);
    if (existsSync(to)) {
      skipped.push(candidate.name);
      continue;
    }
    await rename(from, to);
    moved.push(candidate.name);
  }

  return { moved, skipped };
}
