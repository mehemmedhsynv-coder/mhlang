# mhlang

Interactive CLI that scaffolds a type-safe i18n system for **React** and **Next.js**
projects, backed by a small runtime (`I18nProvider`, `useTranslation`) that ships
with the package.

No config files to hand-write, no flags to remember — run `npx mhlang init`,
answer a few questions, and a working, typed i18n setup appears in your project.

## Install

```bash
npx mhlang init
```

`npx` fetches and runs the CLI on the fly, so there's nothing to install upfront.
The generated files import from the `mhlang` runtime, so add it as a dependency
once the setup is in place:

```bash
npm install mhlang
```

## `npx mhlang init`

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
◇  Enable locale-based URL routing? (e.g. /az/..., /en/...)
│  ● No
│  ○ Yes
│
◇  Ready to create i18n setup. Continue?
│  ● Yes
│  ○ No
│
└  ✔ i18n setup created successfully!
```

Picking **Custom...** in the language list asks for a code (e.g. `ka`) and lets you
add more than one; custom codes are validated and merged with the predefined ones.

The "Enable locale-based URL routing?" question only appears when you picked
**Next.js** — React setups skip straight to "Ready to create i18n setup?". See
[URL-prefixed routing](#url-prefixed-routing-nextjs-only) below for what it generates.

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

For `Next.js` / `src/i18n` / locales `az, en, ru` (with URL routing enabled):

```text
proxy.ts
src/
└── i18n/
    ├── config.ts
    ├── index.ts
    ├── provider.tsx
    ├── request.ts
    ├── hooks/
    │   └── useTranslation.ts
    ├── utils/
    │   └── translation.ts
    └── messages/
        ├── az.json
        ├── en.json
        └── ru.json
```

`request.ts` and the RSC-only `getTranslations()` export are Next.js-only —
picking `React` skips both, along with the routing file. That routing file is
only generated when you answer **Yes** to the URL-routing question, and it's the
one file placed at your project root instead of inside the i18n directory
(Next.js requires it there). It's named `proxy.ts` (Next.js 16+) or `middleware.ts`
(older versions) depending on the Next.js version installed in your project — see
[URL-prefixed routing](#url-prefixed-routing-nextjs-only) below.

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

### Plurals, numbers & dates (ICU MessageFormat)

Messages containing `plural`, `select`, `number`, or `date` argument syntax are
resolved via native `Intl.PluralRules` / `Intl.NumberFormat` / `Intl.DateTimeFormat`
— everything else keeps working exactly as before (`{{mustache}}` interpolation and
ICU can be mixed in the same message):

```json
{
  "cart": {
    "items": "{count, plural, =0 {Your cart is empty} one {# item} other {# items}}"
  },
  "price": "Total: {amount, number}",
  "due": "Due {date, date}"
}
```

```tsx
t("cart.items", { count: 0 }); // "Your cart is empty"
t("cart.items", { count: 1 }); // "1 item"
t("cart.items", { count: 5 }); // "5 items"
t("price", { amount: 1234.5 }); // "Total: 1,234.5" (formatted for the active locale)
```

This is intentionally a **minimal** subset of the ICU spec: `plural` supports exact
`=N` branches plus the standard CLDR categories (`one`/`few`/`many`/`other`/...) with
`#` substitution, `select` supports exact-match branches with a required `other`
fallback, and `number`/`date` use each `Intl` formatter's default formatting — there's
no `offset:`, no skeleton/style strings, and no apostrophe-escaping. Reach for a
dedicated ICU library if you need the full spec.

### Type-safe translation keys

`useTranslation()` and `getTranslator()` are generic over the **default locale's**
message keys, computed live from its imported JSON — so this is a compile-time error:

```tsx
t("auth.login.titel"); // Argument of type '"auth.login.titel"' is not assignable to type 'MessageKeys'.
```

and this autocompletes in your editor:

```tsx
t("auth.login.title"); // ✓
```

Because the key type is derived from `typeof <defaultLocaleMessages>` rather than a
generated snapshot, editing `messages/<defaultLocale>.json` updates the allowed keys
immediately on save — there's no `generate`/`sync` step to remember. This does mean an
empty `messages/<defaultLocale>.json` (e.g. `includeExamples: false`) has no valid keys
yet, by design — add your first key and the type follows.

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

### Server Components: `await getTranslations()` (Next.js only)

Next.js scaffolds also get an async, request-aware translator — no locale to pass
by hand, no prop-drilling:

```tsx
import { getTranslations } from "@/i18n";

export default async function Page() {
  const t = await getTranslations();
  return <h1>{t("common.hello")}</h1>;
}
```

It's backed by `request.ts` (`getRequestLocale()`), which resolves the active locale
per request — checking, in order, the `x-mhlang-locale` header (set by the routing
file when URL routing is on), the `mhlang-locale` cookie, the `Accept-Language`
header, then `defaultLocale` — and is memoized per request via React's `cache()`, so calling
`getTranslations()` from multiple components in the same request tree is free.

### URL-prefixed routing (Next.js only)

Answering **Yes** to "Enable locale-based URL routing?" during `init` additionally generates
a project-root routing file: it redirects any URL missing a known locale prefix
(e.g. `/about` → `/az/about`, resolved from the `mhlang-locale` cookie, then
`Accept-Language`, then `defaultLocale`) and, once a request already has a prefix,
forwards the resolved locale to `request.ts` via the `x-mhlang-locale` header so it
never has to re-parse the URL. Without URL routing, `request.ts` still works — it
just relies on the cookie and `Accept-Language` header instead of the path.

Next.js 16 renamed this file (and its exported function) from `middleware`/`middleware.ts`
to `proxy`/`proxy.ts`. `mhlang` detects the installed Next.js version (via
`node_modules/next/package.json`) and generates the matching one automatically — Next.js
16+ (or no Next.js installed yet) gets `proxy.ts`, older versions get `middleware.ts`. If
your project is upgraded to Next.js 16 later and you already have a `middleware.ts` from an
older `init`, running `npx mhlang init` again (or `add-language`/`remove-language`) detects
the leftover and offers to replace it with `proxy.ts` — a stale `middleware.ts` is otherwise
silently ignored by Next.js rather than erroring, which can quietly disable auth/redirect logic.

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
> into a Next.js App Router server tree instead of going through `npx mhlang init`,
> wrap it in your own `"use client"` file as above — this is the same pattern
> [Next.js recommends](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#supporting-libraries-that-need-context)
> for any third-party component library.

## CLI reference

```bash
npx mhlang init                    # interactive setup
npx mhlang add-language <code>     # add a locale, cloned from the default locale's keys (blank values)
npx mhlang remove-language <code>  # remove a locale (refuses to remove the default locale)
npx mhlang check                   # report keys missing/untranslated in any locale; exits 1 if any (CI-friendly)
npx mhlang missing [locale]        # alias for `check`, optionally scoped to one locale
npx mhlang --help
npx mhlang --version
```

`add-language`/`remove-language`/`check`/`missing` auto-detect an existing `init`
scaffold (`src/i18n` or `i18n`) — pass `--path <dir>` to point at a different one.

```bash
npx mhlang add-language de
# Added "de" (cloned from "az" with blank values).
# Fill in messages/de.json, then run `npx mhlang check`.

npx mhlang check
# Missing keys relative to "az":
#
#   de
#     • common.hello
#     • common.welcome
```

A key counts as missing if it's absent **or** still the blank `""` placeholder
`add-language` writes — so `check` actually catches untranslated entries, not just
structurally-missing ones.

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
