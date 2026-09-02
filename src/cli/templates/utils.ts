import type { InitAnswers } from "../types.js";
import { toIdentifier } from "./shared.js";

export function renderUtilsTs(answers: Pick<InitAnswers, "locales" | "defaultLocale" | "projectType">): string {
  const imports = answers.locales
    .map((locale) => `import ${toIdentifier(locale)} from "../messages/${locale}.json";`)
    .join("\n");
  const messagesEntries = answers.locales
    .map((locale) => `  ${JSON.stringify(locale)}: ${toIdentifier(locale)},`)
    .join("\n");
  const defaultIdentifier = toIdentifier(answers.defaultLocale);

  const asyncTranslator =
    answers.projectType === "nextjs"
      ? `

const resolveTranslator = cache(async () => {
  const locale = await getRequestLocale();
  return createTranslator<MessageKeys>(messages[locale], { locale });
});

/** RSC-only: resolves the translator for the current request, cached per request. */
export async function getTranslations() {
  return resolveTranslator();
}`
      : "";

  return `import { createTranslator } from "mhlang";
import type { NestedKeyOf } from "mhlang";
${answers.projectType === "nextjs" ? 'import { cache } from "react";\nimport { getRequestLocale } from "../request";\n' : ""}import { i18nConfig } from "../config";
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
}${asyncTranslator}
`;
}
