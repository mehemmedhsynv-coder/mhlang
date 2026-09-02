import path from "node:path";
import { rm } from "node:fs/promises";
import pc from "picocolors";
import { normalizeLanguageCode } from "../data/languages.js";
import { buildFilePlan } from "../generators/plan.js";
import { writeFiles } from "../generators/files.js";
import { locateProject } from "../utils/locateProject.js";
import { staleRoutingFilePath } from "../utils/routingFile.js";
import type { RoutingFileName } from "../utils/routingFile.js";
import type { InitAnswers } from "../types.js";

export interface RemoveLanguageOptions {
  path?: string | undefined;
  cwd?: string | undefined;
}

export async function removeLanguage(code: string, options: RemoveLanguageOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const normalized = normalizeLanguageCode(code);

  const project = await locateProject(cwd, options.path);

  if (!project.locales.includes(normalized)) {
    throw new Error(`[mhlang] "${normalized}" is not currently configured.`);
  }
  if (normalized === project.defaultLocale) {
    throw new Error(
      `[mhlang] Cannot remove "${normalized}" because it is the default locale. Change the default locale first.`
    );
  }

  const answers: InitAnswers = {
    projectType: project.projectType,
    targetPath: project.targetPath,
    locales: project.locales.filter((locale) => locale !== normalized),
    defaultLocale: project.defaultLocale,
    includeExamples: false,
    persist: project.persist,
    urlRouting: project.urlRouting,
  };

  const plan = buildFilePlan(answers, cwd);
  const derivedFiles = plan.filter((file) => !file.relativePath.startsWith("messages/"));
  await writeFiles(project.targetDir, derivedFiles);

  const routingFile = plan.find((file) => file.relativePath === "proxy.ts" || file.relativePath === "middleware.ts");
  if (routingFile) {
    const stalePath = staleRoutingFilePath(cwd, routingFile.relativePath as RoutingFileName);
    if (stalePath) {
      await rm(stalePath);
      console.log(pc.dim(`Removed stale ${path.basename(stalePath)} (using ${routingFile.relativePath} instead).`));
    }
  }

  await rm(path.join(project.targetDir, "messages", `${normalized}.json`));

  console.log(pc.green(`Removed "${normalized}". Updated config.ts, provider.tsx, and related files.`));
}
