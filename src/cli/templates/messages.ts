import { getExampleMessages } from "../data/languages.js";

export function renderMessagesJson(locale: string, includeExamples: boolean): string {
  if (!includeExamples) {
    return "{}\n";
  }
  return `${JSON.stringify(getExampleMessages(locale), null, 2)}\n`;
}
