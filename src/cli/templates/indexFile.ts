import type { InitAnswers } from "../types.js";

export function renderIndexTs(answers: Pick<InitAnswers, "projectType">): string {
  const nextjsExports =
    answers.projectType === "nextjs"
      ? `export { getTranslations } from "./utils/translation";
export { getRequestLocale } from "./request";
`
      : "";

  return `export { I18nProvider } from "./provider";
export { useTranslation } from "./hooks/useTranslation";
export { getTranslator } from "./utils/translation";
${nextjsExports}export { i18nConfig, locales } from "./config";
export type { Locale } from "./config";
`;
}
