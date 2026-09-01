export type Messages = {
  [key: string]: string | Messages;
};

export interface I18nConfig<Locale extends string = string> {
  defaultLocale: Locale;
  locales: readonly Locale[];
}

export type TranslateParams = Record<string, string | number>;

export type Translator = (key: string, params?: TranslateParams) => string;

export interface UseTranslationResult<Locale extends string = string> {
  t: Translator;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  availableLocales: Locale[];
}
