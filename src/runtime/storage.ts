export const DEFAULT_STORAGE_KEY = "mhlang-locale";

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

/**
 * Reads the persisted locale from `localStorage`. Safe to call during SSR or in
 * any environment without a `window` — returns `null` instead of throwing.
 */
export function getStoredLocale(storageKey: string = DEFAULT_STORAGE_KEY): string | null {
  if (!hasLocalStorage()) return null;
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

/**
 * Persists the given locale to `localStorage`. Safe to call during SSR or in
 * any environment without a `window` — silently does nothing.
 */
export function setStoredLocale(locale: string, storageKey: string = DEFAULT_STORAGE_KEY): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(storageKey, locale);
  } catch {
    // Ignore write failures (private browsing, quota exceeded, etc.)
  }
}
