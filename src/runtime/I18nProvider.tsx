"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { I18nConfig, Messages, Translator } from "./types.js";
import { createTranslator } from "./translate.js";
import { getStoredLocale, setStoredLocale, DEFAULT_STORAGE_KEY } from "./storage.js";

export interface I18nContextValue<Locale extends string = string> {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  availableLocales: Locale[];
  t: Translator;
}

// The context intentionally holds `I18nContextValue<string>` — `useTranslation`
// widens it back to the caller's own `Locale` type parameter.
export const I18nContext = createContext<I18nContextValue<string> | null>(null);

export interface I18nProviderProps<Locale extends string = string> {
  /** Locale configuration: which locale is the default and which are supported. */
  config: I18nConfig<Locale>;
  /** Messages tree per locale, e.g. `{ az: {...}, en: {...} }`. */
  messages: Record<Locale, Messages>;
  /** Persist the active locale to `localStorage` and restore it on mount. */
  persist?: boolean;
  /** Custom `localStorage` key used when `persist` is enabled. */
  storageKey?: string;
  /**
   * Overrides `config.defaultLocale` for the first render — e.g. the locale resolved from a
   * `[locale]` URL segment. When set, this is authoritative: it takes priority over any
   * persisted `localStorage` value (which is instead kept in sync with it) rather than being
   * overridden by one, so the rendered locale always matches the URL.
   */
  initialLocale?: Locale;
  children: ReactNode;
}

function isDev(): boolean {
  return typeof process !== "undefined" && process.env?.["NODE_ENV"] !== "production";
}

/**
 * Provides locale state and translations to the component tree.
 *
 * The first render always uses `config.defaultLocale`, matching what the
 * server would have rendered — this keeps Next.js App Router hydration safe.
 * When `persist` is enabled, the persisted locale (if any) is applied in an
 * effect after mount, once the client is guaranteed to be interactive.
 */
export function I18nProvider<Locale extends string = string>(props: I18nProviderProps<Locale>) {
  const { config, messages, persist = false, storageKey = DEFAULT_STORAGE_KEY, initialLocale, children } = props;
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? config.defaultLocale);

  useEffect(() => {
    if (!persist) return;
    if (initialLocale !== undefined) {
      // The URL (or other external source) is authoritative — keep localStorage in sync with
      // it instead of letting a possibly-stale stored value override the current render.
      setStoredLocale(initialLocale, storageKey);
      return;
    }
    const stored = getStoredLocale(storageKey);
    if (stored && (config.locales as readonly string[]).includes(stored)) {
      setLocaleState(stored as Locale);
    }
    // Runs once on mount, after the server-matching first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback(
    (next: Locale) => {
      if (!(config.locales as readonly string[]).includes(next)) {
        if (isDev()) {
          console.warn(`[mhlang] Attempted to set unknown locale "${next}". Ignored.`);
        }
        return;
      }
      setLocaleState(next);
      if (persist) setStoredLocale(next, storageKey);
    },
    [config.locales, persist, storageKey]
  );

  const t = useMemo(
    () => createTranslator(messages[locale] ?? {}, { locale }),
    [messages, locale]
  );

  // The context is intentionally widened to `string` (see `I18nContext` above),
  // so `setLocale` here must accept any string; invalid locales are rejected
  // by the check inside `setLocale` regardless of what the caller passes.
  const contextSetLocale = useCallback((next: string) => setLocale(next as Locale), [setLocale]);

  const value = useMemo<I18nContextValue<string>>(
    () => ({ locale, setLocale: contextSetLocale, availableLocales: [...config.locales], t }),
    [locale, contextSetLocale, config.locales, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
