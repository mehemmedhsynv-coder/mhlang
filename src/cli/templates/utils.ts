import type { InitAnswers } from "../types.js";
import { toIdentifier } from "./shared.js";

export function renderUtilsTs(answers: Pick<InitAnswers, "locales">): string {
  const imports = answers.locales
    .map((locale) => `import ${toIdentifier(locale)} from "../messages/${locale}.json";`)
    .join("\n");
  const messagesEntries = answers.locales
    .map((locale) => `  ${JSON.stringify(locale)}: ${toIdentifier(locale)},`)
    .join("\n");

  return `import { createTranslator } from "mhlang";
import { i18nConfig } from "../config";
import type { Locale } from "../config";
${imports}

const messages = {
${messagesEntries}
};

/**
 * Creates a standalone translator for a given locale, usable outside of React
 * (e.g. Server Components, middleware, or plain scripts).
 */
export function getTranslator(locale: Locale = i18nConfig.defaultLocale) {
  return createTranslator(messages[locale], { locale });
}
`;
}
