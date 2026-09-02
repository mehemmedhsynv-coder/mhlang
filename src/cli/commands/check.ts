import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import pc from "picocolors";
import { findMissingKeys } from "../generators/messageKeys.js";
import type { JsonMessages } from "../generators/messageKeys.js";
import { locateProject } from "../utils/locateProject.js";

export interface CheckOptions {
  path?: string | undefined;
  locale?: string | undefined;
  cwd?: string | undefined;
}

/** Reports translation keys missing from any locale relative to the default locale. Exits non-zero (via `process.exitCode`) when any are found, for CI use. */
export async function check(options: CheckOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const project = await locateProject(cwd, options.path);

  const messagesDir = path.join(project.targetDir, "messages");
  const files = await readdir(messagesDir);
  const allMessages: Record<string, JsonMessages> = {};

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const locale = file.slice(0, -".json".length);
    const raw = await readFile(path.join(messagesDir, file), "utf8");
    allMessages[locale] = JSON.parse(raw) as JsonMessages;
  }

  let reports = findMissingKeys(allMessages, project.defaultLocale);
  if (options.locale) {
    reports = reports.filter((report) => report.locale === normalizeLocaleFilter(options.locale!));
  }

  if (reports.length === 0) {
    const scope = options.locale ? ` for "${options.locale}"` : "";
    console.log(pc.green(`No missing keys${scope}. All locales match "${project.defaultLocale}".`));
    return;
  }

  console.log(pc.yellow(`Missing keys relative to "${project.defaultLocale}":`));
  for (const report of reports) {
    console.log(`\n  ${pc.bold(report.locale)}`);
    for (const key of report.missingKeys) {
      console.log(`    ${pc.dim("•")} ${key}`);
    }
  }
  process.exitCode = 1;
}

function normalizeLocaleFilter(locale: string): string {
  return locale.trim().toLowerCase();
}
