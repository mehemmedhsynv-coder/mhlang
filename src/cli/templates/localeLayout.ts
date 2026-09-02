export interface RenderLocaleLayoutOptions {
  /** Import specifier for the generated `provider.tsx`, relative to the layout's own location. */
  providerImport: string;
  /** Import specifier for the generated `config.ts`, relative to the layout's own location. */
  configImport: string;
}

/**
 * Renders `app/[locale]/layout.tsx`: validates the `[locale]` URL segment (404s on an unknown
 * one), declares `generateStaticParams()` so every locale is statically known, and wraps
 * `children` in the generated `I18nProvider` with that locale as the authoritative starting
 * state — this is what makes `useTranslation()`'s router-aware `setLocale` (see `hook.ts`)
 * and the server-side `getRequestLocale()` (see `request.ts`) agree on the active locale.
 */
export function renderLocaleLayoutTsx(options: RenderLocaleLayoutOptions): string {
  return `import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { I18nProvider } from "${options.providerImport}";
import { locales } from "${options.configImport}";
import type { Locale } from "${options.configImport}";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(locales as readonly string[]).includes(locale)) {
    notFound();
  }

  return <I18nProvider locale={locale as Locale}>{children}</I18nProvider>;
}
`;
}
