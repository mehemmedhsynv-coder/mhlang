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

/** Next.js's route-segment file conventions — the only files that make a folder (or the app
 *  root itself) an actual route rather than just colocated code. */
const ROUTE_SEGMENT_FILE_PATTERN =
  /^(page|route|layout|loading|error|not-found|template|default)\.(tsx|ts|jsx|js|mjs|cjs)$/;

/** True if `dir` (or anything nested inside it) contains a route-segment file — i.e. it's an
 *  actual route (or a route group/parent of one), not just a colocated helper directory like
 *  `components/`, `lib/`, or `hooks/` that happens to live inside `app/`. */
async function containsRoute(dir: string): Promise<boolean> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && ROUTE_SEGMENT_FILE_PATTERN.test(entry.name)) return true;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && (await containsRoute(path.join(dir, entry.name)))) return true;
  }
  return false;
}

export interface MigrationCandidate {
  name: string;
  isDirectory: boolean;
}

/**
 * Lists top-level entries directly inside `appDir` that represent existing routes and should
 * move under `[locale]/` for URL-prefixed i18n to apply site-wide (e.g. `page.tsx`, `about/`,
 * a `(marketing)/` route group). A top-level file only qualifies if it's itself a route-segment
 * convention (`page.tsx`, `loading.tsx`, etc.) — a stray file like `constants.ts` is left alone.
 * A top-level directory only qualifies if it (or something nested inside it) actually contains a
 * route-segment file — a colocated helper directory like `components/`, `lib/`, or `hooks/` with
 * no `page`/`route` anywhere inside it is left alone, even though it lives under `app/`.
 * Root-only conventions (`layout.tsx`, `api/`, icon/manifest files, an already-migrated
 * `[locale]/`) are excluded outright, before that check.
 */
export async function findMigrationCandidates(appDir: string): Promise<MigrationCandidate[]> {
  if (!existsSync(appDir)) return [];
  const entries = await readdir(appDir, { withFileTypes: true });
  const candidates: MigrationCandidate[] = [];

  for (const entry of entries) {
    if (isNeverMigrated(entry.name)) continue;

    if (entry.isDirectory()) {
      if (await containsRoute(path.join(appDir, entry.name))) {
        candidates.push({ name: entry.name, isDirectory: true });
      }
      continue;
    }

    if (ROUTE_SEGMENT_FILE_PATTERN.test(entry.name)) {
      candidates.push({ name: entry.name, isDirectory: false });
    }
  }

  return candidates;
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
