import path from "node:path";
import { readFile, rm, writeFile } from "node:fs/promises";
import pc from "picocolors";
import { isValidLanguageCode, normalizeLanguageCode } from "../data/languages.js";
import { blankMessages } from "../generators/messageKeys.js";
import type { JsonMessages } from "../generators/messageKeys.js";
import { buildFilePlan } from "../generators/plan.js";
import { writeFiles } from "../generators/files.js";
import { locateProject } from "../utils/locateProject.js";
import { staleRoutingFilePath } from "../utils/routingFile.js";
import type { RoutingFileName } from "../utils/routingFile.js";
import type { InitAnswers } from "../types.js";

export interface AddLanguageOptions {
  path?: string | undefined;
  cwd?: string | undefined;
}

export async function addLanguage(code: string, options: AddLanguageOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const normalized = normalizeLanguageCode(code);

  if (!isValidLanguageCode(normalized)) {
    throw new Error(`[mhlang] "${code}" is not a valid language code (e.g. "de" or "pt-BR").`);
  }

  const project = await locateProject(cwd, options.path);

  if (project.locales.includes(normalized)) {
    throw new Error(`[mhlang] "${normalized}" is already configured.`);
  }

  const defaultMessagesRaw = await readFile(
    path.join(project.targetDir, "messages", `${project.defaultLocale}.json`),
    "utf8"
  );
  const blanked = blankMessages(JSON.parse(defaultMessagesRaw) as JsonMessages);

  const answers: InitAnswers = {
    projectType: project.projectType,
    targetPath: project.targetPath,
    locales: [...project.locales, normalized],
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

  const newMessagesPath = path.join(project.targetDir, "messages", `${normalized}.json`);
  await writeFile(newMessagesPath, `${JSON.stringify(blanked, null, 2)}\n`, "utf8");

  console.log(
    pc.green(
      `Added "${normalized}" (cloned from "${project.defaultLocale}" with blank values). ` +
        `Fill in messages/${normalized}.json, then run \`npx mhlang check\`.`
    )
  );
}
