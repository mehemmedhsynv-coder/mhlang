import type { InitAnswers } from "../types.js";
import { toIdentifier } from "./shared.js";

export function renderUtilsTs(answers: Pick<InitAnswers, "locales" | "defaultLocale">): string {
  const imports = answers.locales
    .map((locale) => `import ${toIdentifier(locale)} from "../messages/${locale}.json";`)
    .join("\n");
  const messagesEntries = answers.locales
    .map((locale) => `  ${JSON.stringify(locale)}: ${toIdentifier(locale)},`)
    .join("\n");
  const defaultIdentifier = toIdentifier(answers.defaultLocale);

  return `import { createTranslator } from "mhlang";
import type { NestedKeyOf } from "mhlang";
import { i18nConfig } from "../config";
import type { Locale } from "../config";
${imports}

const messages = {
${messagesEntries}
};

type MessageKeys = NestedKeyOf<typeof ${defaultIdentifier}>;

/**
 * Creates a standalone translator for a given locale, usable outside of React
 * (e.g. Server Components, middleware, or plain scripts).
 */
export function getTranslator(locale: Locale = i18nConfig.defaultLocale) {
  return createTranslator<MessageKeys>(messages[locale], { locale });
}
`;
}
