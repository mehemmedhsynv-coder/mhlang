import type { InitAnswers } from "../types.js";
import { renderConfigTs } from "../templates/config.js";
import { renderIndexTs } from "../templates/indexFile.js";
import { renderProviderTsx } from "../templates/provider.js";
import { renderHookTs } from "../templates/hook.js";
import { renderUtilsTs } from "../templates/utils.js";
import { renderMessagesJson } from "../templates/messages.js";

export interface PlannedFile {
  /** Path relative to the i18n target directory, using forward slashes. */
  relativePath: string;
  content: string;
}

/** Builds the full list of files to generate for a given set of init answers. */
export function buildFilePlan(answers: InitAnswers): PlannedFile[] {
  const files: PlannedFile[] = [
    { relativePath: "config.ts", content: renderConfigTs(answers) },
    { relativePath: "index.ts", content: renderIndexTs() },
    { relativePath: "provider.tsx", content: renderProviderTsx(answers) },
    { relativePath: "hooks/useTranslation.ts", content: renderHookTs(answers) },
    { relativePath: "utils/translation.ts", content: renderUtilsTs(answers) },
  ];

  for (const locale of answers.locales) {
    files.push({
      relativePath: `messages/${locale}.json`,
      content: renderMessagesJson(locale, answers.includeExamples),
    });
  }

  return files;
}
