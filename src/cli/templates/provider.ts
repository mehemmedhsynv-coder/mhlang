import type { InitAnswers } from "../types.js";
import { toIdentifier } from "./shared.js";

export function renderProviderTsx(answers: Pick<InitAnswers, "locales" | "persist">): string {
  const imports = answers.locales
    .map((locale) => `import ${toIdentifier(locale)} from "./messages/${locale}.json";`)
    .join("\n");
  const messagesEntries = answers.locales
    .map((locale) => `  ${JSON.stringify(locale)}: ${toIdentifier(locale)},`)
    .join("\n");

  return `"use client";

import type { ReactNode } from "react";
import { I18nProvider as BaseI18nProvider } from "mhlang";
import { i18nConfig } from "./config";
${imports}

const messages = {
${messagesEntries}
};

export interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  return (
    <BaseI18nProvider config={i18nConfig} messages={messages} persist={${answers.persist}}>
      {children}
    </BaseI18nProvider>
  );
}
`;
}
