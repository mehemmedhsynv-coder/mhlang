import type { InitAnswers } from "../types.js";

export interface RenderProxyOptions {
  /** Next.js 16+ uses `proxy`; earlier versions use `middleware` (same body either way). */
  functionName: "proxy" | "middleware";
}

/**
 * Renders the project-root routing file: redirects `/foo` to `/{locale}/foo` when the URL is
 * missing a known locale prefix, and otherwise forwards the resolved locale to `request.ts` via
 * the `x-mhlang-locale` request header (so it never has to re-parse the URL). The exported
 * function is named `proxy` or `middleware` depending on the target Next.js version — see
 * `resolveRoutingFileName` in `utils/routingFile.ts`.
 */
export function renderProxyTs(answers: Pick<InitAnswers, "targetPath">, options: RenderProxyOptions): string {
  const { functionName } = options;

  return `import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "./${answers.targetPath}/config";

const COOKIE_NAME = "mhlang-locale";
const HEADER_NAME = "x-mhlang-locale";

function pickFromAcceptLanguage(header: string | null): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(",")) {
    const code = part.split(";")[0]?.trim().toLowerCase();
    const match = (locales as readonly string[]).find((locale) => code === locale || code?.startsWith(\`\${locale}-\`));
    if (match) return match;
  }
  return undefined;
}

function resolveLocale(request: NextRequest): string {
  const fromCookie = request.cookies.get(COOKIE_NAME)?.value;
  if (fromCookie && (locales as readonly string[]).includes(fromCookie)) return fromCookie;

  const fromHeader = pickFromAcceptLanguage(request.headers.get("accept-language"));
  if (fromHeader) return fromHeader;

  return defaultLocale;
}

export function ${functionName}(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocalePrefix = (locales as readonly string[]).some(
    (locale) => pathname === \`/\${locale}\` || pathname.startsWith(\`/\${locale}/\`)
  );

  if (!hasLocalePrefix) {
    const locale = resolveLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = \`/\${locale}\${pathname}\`;
    return NextResponse.redirect(url);
  }

  const locale = pathname.split("/")[1]!;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(HEADER_NAME, locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
`;
}
