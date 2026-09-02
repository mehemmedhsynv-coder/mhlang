import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { PRESET_PATHS } from "../types.js";
import type { ProjectType } from "../types.js";

export interface LocatedProject {
  targetDir: string;
  targetPath: string;
  locales: string[];
  defaultLocale: string;
  projectType: ProjectType;
  persist: boolean;
  urlRouting: boolean;
}

const LOCALES_PATTERN = /export const locales = \[(.*?)\] as const;/;
const DEFAULT_LOCALE_PATTERN = /defaultLocale:\s*"([^"]+)"/;
const PERSIST_PATTERN = /persist=\{(true|false)\}/;

function parseDefaultLocale(configContent: string): string {
  const match = configContent.match(DEFAULT_LOCALE_PATTERN);
  if (!match) {
    throw new Error("[mhlang] Could not parse defaultLocale from config.ts.");
  }
  return match[1]!;
}

/**
 * Locates an existing `npx mhlang init` scaffold, preferring an explicit `overridePath`
 * and otherwise scanning `PRESET_PATHS`. Re-derives the current setup by reading generated
 * files rather than a separate manifest: `messages/*.json` is the source of truth for the
 * locale list, `config.ts` for the default locale, `provider.tsx` for `persist`, and the
 * presence of `request.ts` / a root `middleware.ts` for `projectType` / `urlRouting`.
 */
export async function locateProject(cwd: string, overridePath?: string): Promise<LocatedProject> {
  const candidates = overridePath ? [overridePath] : [...PRESET_PATHS];

  for (const candidate of candidates) {
    const targetDir = path.resolve(cwd, candidate);
    const configPath = path.join(targetDir, "config.ts");
    if (!existsSync(configPath)) continue;

    const defaultLocale = parseDefaultLocale(readFileSync(configPath, "utf8"));

    const messagesDir = path.join(targetDir, "messages");
    const messageFiles = existsSync(messagesDir) ? await readdir(messagesDir) : [];
    const locales = messageFiles.filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -".json".length));

    const providerContent = readFileSync(path.join(targetDir, "provider.tsx"), "utf8");
    const persistMatch = providerContent.match(PERSIST_PATTERN);
    const persist = persistMatch?.[1] === "true";

    const projectType: ProjectType = existsSync(path.join(targetDir, "request.ts")) ? "nextjs" : "react";
    const urlRouting = projectType === "nextjs" && existsSync(path.join(cwd, "middleware.ts"));

    return { targetDir, targetPath: candidate, locales, defaultLocale, projectType, persist, urlRouting };
  }

  const attempted = overridePath ? `"${overridePath}"` : PRESET_PATHS.map((preset) => `"${preset}"`).join(", ");
  throw new Error(`[mhlang] Could not find an existing i18n setup (looked in ${attempted}). Run \`npx mhlang init\` first.`);
}
