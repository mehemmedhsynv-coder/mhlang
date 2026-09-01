import { isValidLanguageCode, normalizeLanguageCode } from "../data/languages.js";

/**
 * Validates a custom language code entered by the user.
 * Returns an error message string when invalid, or `undefined` when valid —
 * matching the `validate` callback shape expected by `@clack/prompts`.
 */
export function validateCustomLanguageCode(
  code: string | undefined,
  existing: readonly string[]
): string | undefined {
  const normalized = normalizeLanguageCode(code ?? "");
  if (!normalized) return "Language code cannot be empty.";
  if (!isValidLanguageCode(normalized)) {
    return 'Enter a valid language code, e.g. "ka" or "pt-BR".';
  }
  if (existing.includes(normalized)) return `"${normalized}" is already selected.`;
  return undefined;
}

/** Merges predefined selections with normalized custom codes, de-duplicated, order preserved. */
export function buildLanguageList(predefined: readonly string[], custom: readonly string[]): string[] {
  const normalizedCustom = custom.map(normalizeLanguageCode);
  return Array.from(new Set([...predefined, ...normalizedCustom]));
}

/** Falls back to the first available locale if the requested default isn't in the final list. */
export function resolveDefaultLocale(requested: string, locales: readonly string[]): string {
  if (locales.includes(requested)) return requested;
  const fallback = locales[0];
  if (fallback === undefined) {
    throw new Error("[mhlang] Cannot resolve a default locale from an empty locale list.");
  }
  return fallback;
}

export function validateTargetPath(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "Path cannot be empty.";
  if (trimmed.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(trimmed)) {
    return "Enter a path relative to your project root, not an absolute path.";
  }
  if (trimmed.includes("..")) return 'Path cannot contain "..".';
  return undefined;
}
