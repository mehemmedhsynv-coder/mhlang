import type { InitAnswers } from "../types.js";

export function renderConfigTs(answers: Pick<InitAnswers, "locales" | "defaultLocale">): string {
  const localesLiteral = answers.locales.map((locale) => JSON.stringify(locale)).join(", ");

  return `import type { I18nConfig } from "mhlang";

export const locales = [${localesLiteral}] as const;

export type Locale = (typeof locales)[number];

export const i18nConfig: I18nConfig<Locale> = {
  defaultLocale: ${JSON.stringify(answers.defaultLocale)},
  locales,
};
`;
}
