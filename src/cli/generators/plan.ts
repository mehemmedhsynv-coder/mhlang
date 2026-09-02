import path from "node:path";
import type { InitAnswers } from "../types.js";
import { renderConfigTs } from "../templates/config.js";
import { renderIndexTs } from "../templates/indexFile.js";
import { renderProviderTsx } from "../templates/provider.js";
import { renderHookTs } from "../templates/hook.js";
import { renderUtilsTs } from "../templates/utils.js";
import { renderMessagesJson } from "../templates/messages.js";
import { renderRequestTs } from "../templates/request.js";
import { renderProxyTs } from "../templates/proxy.js";
import { renderLocaleLayoutTsx } from "../templates/localeLayout.js";
import { resolveRoutingFileName } from "../utils/routingFile.js";
import { detectAppDir, toImportSpecifier } from "../utils/appDir.js";

export interface PlannedFile {
  /** Path relative to the i18n target directory, using forward slashes. */
  relativePath: string;
  /** Overrides `relativePath` resolution for files that must live outside the i18n target dir. */
  absolutePath?: string;
  content: string;
}

/** Set on the `[locale]/layout.tsx` PlannedFile when generated, so `init` can print guidance. */
export const LOCALE_LAYOUT_LABEL = "app/[locale]/layout.tsx";

/** Builds the full list of files to generate for a given set of init answers. */
export function buildFilePlan(answers: InitAnswers, cwd: string = process.cwd()): PlannedFile[] {
  const files: PlannedFile[] = [
    { relativePath: "config.ts", content: renderConfigTs(answers) },
    { relativePath: "index.ts", content: renderIndexTs(answers) },
    { relativePath: "provider.tsx", content: renderProviderTsx(answers) },
    { relativePath: "hooks/useTranslation.ts", content: renderHookTs(answers) },
    { relativePath: "utils/translation.ts", content: renderUtilsTs(answers) },
  ];

  if (answers.projectType === "nextjs") {
    files.push({ relativePath: "request.ts", content: renderRequestTs(answers) });

    if (answers.urlRouting) {
      const fileName = resolveRoutingFileName(cwd);
      files.push({
        relativePath: fileName,
        absolutePath: path.join(cwd, fileName),
        content: renderProxyTs(answers, { functionName: fileName === "proxy.ts" ? "proxy" : "middleware" }),
      });

      const appDir = detectAppDir(cwd);
      if (appDir) {
        const layoutDir = path.join(cwd, appDir, "[locale]");
        const i18nDir = path.join(cwd, answers.targetPath);
        files.push({
          relativePath: LOCALE_LAYOUT_LABEL,
          absolutePath: path.join(layoutDir, "layout.tsx"),
          content: renderLocaleLayoutTsx({
            providerImport: toImportSpecifier(layoutDir, path.join(i18nDir, "provider")),
            configImport: toImportSpecifier(layoutDir, path.join(i18nDir, "config")),
          }),
        });
      }
    }
  }

  for (const locale of answers.locales) {
    files.push({
      relativePath: `messages/${locale}.json`,
      content: renderMessagesJson(locale, answers.includeExamples),
    });
  }

  return files;
}
