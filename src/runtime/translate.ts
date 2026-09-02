import type { Messages, TranslateParams, Translator } from "./types.js";
import { containsICU, formatICU } from "./icu.js";

const INTERPOLATION_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

function isDev(): boolean {
  return typeof process !== "undefined" && process.env?.["NODE_ENV"] !== "production";
}

/**
 * Replaces `{{token}}` placeholders in a template string with values from `params`.
 * A placeholder with no matching param is left untouched.
 */
export function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(INTERPOLATION_PATTERN, (match, token: string) => {
    const value = params[token];
    return value === undefined ? match : String(value);
  });
}

/**
 * Resolves a dot-separated key path (e.g. "auth.login.title") against a nested
 * messages object. Returns `undefined` when any segment of the path is missing.
 */
export function resolveKey(messages: Messages, key: string): unknown {
  const segments = key.split(".");
  let current: unknown = messages;
  for (const segment of segments) {
    if (current !== null && typeof current === "object" && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Creates a standalone `t()` translator bound to a single locale's messages tree.
 * Framework-agnostic: usable outside of React (e.g. in server-side code).
 */
export function createTranslator<Keys extends string = string>(
  messages: Messages,
  options?: { locale?: string }
): Translator<Keys> {
  return function t(key: string, params?: TranslateParams): string {
    const resolved = resolveKey(messages, key);
    if (typeof resolved !== "string") {
      if (isDev()) {
        const localeInfo = options?.locale ? ` (locale: "${options.locale}")` : "";
        console.warn(`[mhlang] Missing translation for key "${key}"${localeInfo}.`);
      }
      return key;
    }
    const formatted = containsICU(resolved) ? formatICU(resolved, params, options?.locale) : resolved;
    return interpolate(formatted, params);
  };
}
