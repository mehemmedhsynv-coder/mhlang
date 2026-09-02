import type { InitAnswers } from "../types.js";

/**
 * Renders `request.ts`: resolves the active locale for the current request, checking
 * (in priority order) the `x-mhlang-locale` header set by `middleware.ts` (only when
 * `urlRouting` is enabled), the `mhlang-locale` cookie, the `Accept-Language` header,
 * then falling back to `defaultLocale`.
 */
export function renderRequestTs(answers: Pick<InitAnswers, "urlRouting">): string {
  const middlewareCheck = answers.urlRouting
    ? `  const fromMiddleware = headerStore.get("x-mhlang-locale");
  if (fromMiddleware && (locales as readonly string[]).includes(fromMiddleware)) return fromMiddleware as Locale;

`
    : "";

  return `import { cookies, headers } from "next/headers";
import { locales, defaultLocale } from "./config";
import type { Locale } from "./config";

const COOKIE_NAME = "mhlang-locale";

function pickFromAcceptLanguage(header: string | null): Locale | undefined {
  if (!header) return undefined;
  for (const part of header.split(",")) {
    const code = part.split(";")[0]?.trim().toLowerCase();
    const match = (locales as readonly string[]).find((locale) => code === locale || code?.startsWith(\`\${locale}-\`));
    if (match) return match as Locale;
  }
  return undefined;
}

/** Resolves the active locale for the current request. */
export async function getRequestLocale(): Promise<Locale> {
  const headerStore = await headers();
${middlewareCheck}  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (fromCookie && (locales as readonly string[]).includes(fromCookie)) return fromCookie as Locale;

  const fromHeader = pickFromAcceptLanguage(headerStore.get("accept-language"));
  if (fromHeader) return fromHeader;

  return defaultLocale;
}
`;
}
