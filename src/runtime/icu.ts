import type { TranslateParams } from "./types.js";

const ICU_DETECT_PATTERN = /\{\s*[\w.]+\s*,\s*(plural|select|number|date)\b/;

/** True when `template` contains ICU MessageFormat syntax (`plural`/`select`/`number`/`date`). */
export function containsICU(template: string): boolean {
  return ICU_DETECT_PATTERN.test(template);
}

function findMatchingBrace(source: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error("[mhlang] Unbalanced braces in ICU message.");
}

/** Splits `content` into at most `limit` parts on top-level commas (ignoring commas nested inside `{...}`). */
function splitTopLevel(content: string, limit: number): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < content.length && parts.length < limit - 1; i++) {
    const ch = content[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(content.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(content.slice(start));
  return parts.map((part) => part.trim());
}

interface CaseBranch {
  key: string;
  message: string;
}

/** Parses a `plural`/`select` case list, e.g. `one {# item} other {# items}`. */
function parseCaseBranches(content: string): CaseBranch[] {
  const branches: CaseBranch[] = [];
  let i = 0;
  while (i < content.length) {
    while (i < content.length && /\s/.test(content[i]!)) i++;
    if (i >= content.length) break;

    const keyStart = i;
    while (i < content.length && content[i] !== "{" && !/\s/.test(content[i]!)) i++;
    const key = content.slice(keyStart, i);

    while (i < content.length && /\s/.test(content[i]!)) i++;
    if (content[i] !== "{") break;

    const close = findMatchingBrace(content, i);
    branches.push({ key, message: content.slice(i + 1, close) });
    i = close + 1;
  }
  return branches;
}

function formatArgument(
  argName: string,
  argType: string | undefined,
  rest: string | undefined,
  params: TranslateParams,
  locale: string | undefined
): string {
  const value = params[argName];

  if (!argType) {
    return value === undefined ? "" : String(value);
  }

  if (argType === "number") {
    return new Intl.NumberFormat(locale).format(Number(value));
  }

  if (argType === "date") {
    return new Intl.DateTimeFormat(locale).format(new Date(value as string | number));
  }

  if (argType === "select") {
    const branches = parseCaseBranches(rest ?? "");
    const key = String(value ?? "");
    const chosen = branches.find((b) => b.key === key) ?? branches.find((b) => b.key === "other");
    return chosen ? formatICU(chosen.message, params, locale) : "";
  }

  if (argType === "plural") {
    const count = Number(value);
    const branches = parseCaseBranches(rest ?? "");
    const category = Number.isFinite(count) ? new Intl.PluralRules(locale).select(count) : "other";
    const chosen =
      branches.find((b) => b.key === `=${count}`) ??
      branches.find((b) => b.key === category) ??
      branches.find((b) => b.key === "other");
    if (!chosen) return "";
    const withCount = chosen.message.replace(/#/g, new Intl.NumberFormat(locale).format(count));
    return formatICU(withCount, params, locale);
  }

  return "";
}

/**
 * Resolves ICU MessageFormat argument syntax (`{arg, plural, ...}`, `{arg, select, ...}`,
 * `{arg, number}`, `{arg, date}`, and plain `{arg}`) against `params`. Only a minimal subset
 * of the ICU spec is supported: no `offset:`, no number/date skeleton or style strings, and
 * no apostrophe-escaping — callers needing the full spec should reach for a dedicated library.
 */
export function formatICU(template: string, params: TranslateParams | undefined, locale: string | undefined): string {
  const p = params ?? {};
  let result = "";
  let i = 0;
  while (i < template.length) {
    if (template[i] === "{") {
      const close = findMatchingBrace(template, i);
      const inner = template.slice(i + 1, close);
      const [argName, argType, rest] = splitTopLevel(inner, 3);
      result += formatArgument(argName!, argType, rest, p, locale);
      i = close + 1;
    } else {
      result += template[i];
      i++;
    }
  }
  return result;
}
