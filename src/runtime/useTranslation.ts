"use client";

import { useContext } from "react";
import { I18nContext } from "./I18nProvider.js";
import type { UseTranslationResult } from "./types.js";

/**
 * Access translation state from the nearest `<I18nProvider>`.
 *
 * @example
 * const { t, locale, setLocale, availableLocales } = useTranslation();
 * t("common.hello");
 * setLocale("en");
 */
export function useTranslation<Locale extends string = string>(): UseTranslationResult<Locale> {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("[mhlang] useTranslation() must be used within an <I18nProvider>.");
  }
  return ctx as unknown as UseTranslationResult<Locale>;
}
