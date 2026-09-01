# mhlang

Interactive CLI that scaffolds a type-safe i18n system for **React** and **Next.js**
projects, backed by a small runtime (`I18nProvider`, `useTranslation`) that ships
with the package.

No config files to hand-write, no flags to remember — install it, run `npx i18n init`,
answer a few questions, and a working, typed i18n setup appears in your project.

## Install

```bash
npm install mhlang
```

Nothing is written to your project at install time. File generation only happens
when you explicitly run the CLI:

```bash
npx i18n init
```

## `npx i18n init`

```text
┌  i18n setup
│
◇  What type of project are you using?
│  ● Next.js
│  ○ React
│
◇  Where should the i18n files be created?
│  ● src/i18n
│  ○ i18n
│  ○ Custom path
│
◇  Select languages:
│  ◉ Azerbaijani (az)
│  ◉ English (en)
│  ◯ Russian (ru)
│  ◯ Turkish (tr)
│  ◯ German (de)
│  ◯ French (fr)
│  ◯ Spanish (es)
│  ◯ Custom...
│
◇  What is your default language?
│  ● az
│  ○ en
│
◇  Create example translations?
│  ● Yes
│  ○ No
│
◇  Use localStorage for language persistence?
│  ● Yes
│  ○ No
│
◇  Ready to create i18n setup. Continue?
│  ● Yes
│  ○ No
│
└  ✔ i18n setup created successfully!
```

Picking **Custom...** in the language list asks for a code (e.g. `ka`) and lets you
add more than one; custom codes are validated and merged with the predefined ones.

If the target directory already has some of these files, the CLI stops and asks
before touching anything:

```text
⚠ i18n directory already exists (src/i18n).
  • src/i18n/config.ts
  • src/i18n/messages/az.json

◇  Do you want to overwrite existing files?
│  ● No
│  ○ Yes
```

Choosing **No** exits without changing a single file.

### What gets generated

For `Next.js` / `src/i18n` / locales `az, en, ru`:

```text
src/
└── i18n/
    ├── config.ts
    ├── index.ts
    ├── provider.tsx
    ├── hooks/
    │   └── useTranslation.ts
    ├── utils/
    │   └── translation.ts
    └── messages/
        ├── az.json
        ├── en.json
        └── ru.json
```

`config.ts` reflects exactly what you picked:

```ts
export const locales = ["az", "en", "ru"] as const;
export type Locale = (typeof locales)[number];

export const i18nConfig: I18nConfig<Locale> = {
  defaultLocale: "az",
  locales,
};
```

These generated files are thin, project-specific glue — the actual `I18nProvider`
and `useTranslation` implementation lives in `mhlang` itself, so a `npm update`
picks up runtime fixes without needing to re-run `init`.

## Using the generated setup

Wrap your app once:

```tsx
import { I18nProvider } from "@/i18n";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
```

Then use translations anywhere inside it:

```tsx
"use client";

import { useTranslation } from "@/i18n";

export function Greeting() {
  const { t, locale, setLocale, availableLocales } = useTranslation();

  return (
    <div>
      <p>{t("common.hello")}</p>
      <p>{t("common.helloUser", { name: "Mehemmed" })}</p>
      <p>{t("auth.login.title")}</p>

      <select value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)}>
        {availableLocales.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Nested keys & interpolation

```json
{
  "auth": {
    "login": {
      "title": "Log in",
      "description": "Enter your details to access your account."
    }
  },
  "common": {
    "helloUser": "Salam, {{name}}!"
  }
}
```

```tsx
t("auth.login.title"); // "Log in"
t("common.helloUser", { name: "Mehemmed" }); // "Salam, Mehemmed!"
```

A key that doesn't resolve to a string returns the key itself and logs a
`console.warn` in development (silent in production).

### Persisting the selected locale

If you answered **Yes** to "Use localStorage for language persistence?", the
active locale is saved to `localStorage` and restored on future visits.

This is implemented in a hydration-safe way for the Next.js App Router: the
**first render always uses `defaultLocale`** (matching what the server rendered),
and the persisted locale is applied in a `useEffect` right after mount — so
there's no server/client mismatch warning.

### Using translations outside React (Server Components, middleware, scripts)

```ts
import { getTranslator } from "@/i18n";

const t = getTranslator("en");
t("common.hello"); // "Hello"
```

## Direct runtime usage (without the CLI)

`mhlang` also exports its runtime directly, if you'd rather wire things up by hand:

```tsx
"use client";

import { I18nProvider, useTranslation, type I18nConfig } from "mhlang";
import az from "./messages/az.json";
import en from "./messages/en.json";

const config: I18nConfig<"az" | "en"> = { defaultLocale: "az", locales: ["az", "en"] };
const messages = { az, en };

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider config={config} messages={messages} persist>
      {children}
    </I18nProvider>
  );
}
```

> The package itself doesn't ship a `"use client"` boundary in its build output
> (bundlers commonly drop the directive). If you import `I18nProvider` directly
> into a Next.js App Router server tree instead of going through `npx i18n init`,
> wrap it in your own `"use client"` file as above — this is the same pattern
> [Next.js recommends](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#supporting-libraries-that-need-context)
> for any third-party component library.

## CLI reference

```bash
npx i18n init       # interactive setup (the only thing you need for v1)
npx i18n --help
npx i18n --version
```

`add-language`, `remove-language`, `check`, and `missing` are on the roadmap —
the CLI is structured (`commands/`, `prompts/`, `generators/`, `templates/`) so
they can be added as new `commands/*.ts` files without touching `init`.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build        # tsup — emits dist/runtime (ESM+CJS+d.ts) and dist/cli (ESM)
npm run cli -- init  # run the CLI from source, via tsx
```

## Publishing

```bash
npm run build
npm publish --access public
```

`prepublishOnly` runs the build automatically. `mhlang` is a scoped-free package
name published with `publishConfig.access: "public"`, so a plain `npm publish`
(after `npm login`) is enough.
