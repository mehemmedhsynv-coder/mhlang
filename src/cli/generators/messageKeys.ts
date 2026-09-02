export type JsonMessages = { [key: string]: string | JsonMessages };

/** Flattens a nested messages object into dot-separated key paths, e.g. "auth.login.title". */
export function flattenKeys(messages: JsonMessages, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(messages)) {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      keys.push(keyPath);
    } else {
      keys.push(...flattenKeys(value, keyPath));
    }
  }
  return keys;
}

export interface MissingKeysReport {
  locale: string;
  missingKeys: string[];
}

function getByPath(messages: JsonMessages, key: string): unknown {
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
 * Compares every locale's keys against `referenceLocale`, reporting which keys each is
 * missing — a key counts as missing when it's absent *or* still blank (`""`, the
 * placeholder `addLanguage` writes), so `check` actually flags untranslated entries.
 */
export function findMissingKeys(
  allMessages: Record<string, JsonMessages>,
  referenceLocale: string
): MissingKeysReport[] {
  const referenceKeys = flattenKeys(allMessages[referenceLocale] ?? {});
  const reports: MissingKeysReport[] = [];

  for (const [locale, messages] of Object.entries(allMessages)) {
    if (locale === referenceLocale) continue;
    const missingKeys = referenceKeys.filter((key) => {
      const value = getByPath(messages, key);
      return typeof value !== "string" || value === "";
    });
    if (missingKeys.length > 0) {
      reports.push({ locale, missingKeys });
    }
  }

  return reports;
}

/** Deep-clones a messages tree, blanking every leaf string value to `""` — used to seed a new locale. */
export function blankMessages(messages: JsonMessages): JsonMessages {
  const result: JsonMessages = {};
  for (const [key, value] of Object.entries(messages)) {
    result[key] = typeof value === "string" ? "" : blankMessages(value);
  }
  return result;
}
