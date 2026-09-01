export function renderIndexTs(): string {
  return `export { I18nProvider } from "./provider";
export { useTranslation } from "./hooks/useTranslation";
export { getTranslator } from "./utils/translation";
export { i18nConfig, locales } from "./config";
export type { Locale } from "./config";
`;
}
