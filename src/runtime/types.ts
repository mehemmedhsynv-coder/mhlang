export type Messages = {
  [key: string]: string | Messages;
};

export interface I18nConfig<Locale extends string = string> {
  defaultLocale: Locale;
  locales: readonly Locale[];
}

export type TranslateParams = Record<string, string | number>;

export type Translator<Keys extends string = string> = (key: Keys, params?: TranslateParams) => string;

export interface UseTranslationResult<Locale extends string = string, Keys extends string = string> {
  t: Translator<Keys>;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  availableLocales: Locale[];
}

/**
 * Recursively computes the dot-separated key paths of a nested messages object,
 * e.g. `{ auth: { login: { title: string } } }` -> `"auth.login.title"`. Applied to a
 * `typeof <importedMessagesJson>` so it stays in sync with the JSON file automatically.
 */
export type NestedKeyOf<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${NestedKeyOf<T[K]>}`;
}[keyof T & string];
