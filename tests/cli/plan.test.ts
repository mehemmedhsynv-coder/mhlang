import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildFilePlan } from "../../src/cli/generators/plan.js";
import type { InitAnswers } from "../../src/cli/types.js";

function makeAnswers(overrides: Partial<InitAnswers> = {}): InitAnswers {
  return {
    projectType: "nextjs",
    targetPath: "src/i18n",
    locales: ["az", "en", "ru"],
    defaultLocale: "az",
    includeExamples: true,
    persist: true,
    urlRouting: false,
    ...overrides,
  };
}

describe("buildFilePlan — folder generation", () => {
  it("creates the exact file set described in the spec", () => {
    const plan = buildFilePlan(makeAnswers());
    const paths = plan.map((f) => f.relativePath).sort();
    expect(paths).toEqual(
      [
        "config.ts",
        "index.ts",
        "provider.tsx",
        "hooks/useTranslation.ts",
        "utils/translation.ts",
        "request.ts",
        "messages/az.json",
        "messages/en.json",
        "messages/ru.json",
      ].sort()
    );
  });

  it("creates one messages/<locale>.json per selected locale, including custom ones", () => {
    const plan = buildFilePlan(makeAnswers({ locales: ["az", "en", "ka"] }));
    const messageFiles = plan.filter((f) => f.relativePath.startsWith("messages/"));
    expect(messageFiles.map((f) => f.relativePath).sort()).toEqual([
      "messages/az.json",
      "messages/en.json",
      "messages/ka.json",
    ]);
  });
});

describe("buildFilePlan — config.ts content", () => {
  it("embeds the selected locales and default locale", () => {
    const plan = buildFilePlan(makeAnswers({ locales: ["az", "en", "ru"], defaultLocale: "az" }));
    const config = plan.find((f) => f.relativePath === "config.ts")!;
    expect(config.content).toContain('defaultLocale: "az"');
    expect(config.content).toContain('["az", "en", "ru"] as const');
    expect(config.content).toContain("export type Locale");
  });
});

describe("buildFilePlan — messages JSON generation", () => {
  it("generates example translations with nested keys and interpolation when requested", () => {
    const plan = buildFilePlan(makeAnswers({ includeExamples: true, locales: ["az", "en"] }));
    const az = JSON.parse(plan.find((f) => f.relativePath === "messages/az.json")!.content);
    const en = JSON.parse(plan.find((f) => f.relativePath === "messages/en.json")!.content);

    expect(az.common.hello).toBe("Salam");
    expect(az.common.welcome).toBe("Xoş gəlmisiniz");
    expect(en.common.hello).toBe("Hello");

    // Nested keys, matching the spec's auth.login.title / auth.login.description example.
    expect(az.auth.login.title).toBeTypeOf("string");
    expect(az.auth.login.description).toBeTypeOf("string");

    // Interpolation placeholder present in the example.
    expect(az.common.helloUser).toContain("{{name}}");
  });

  it("generates an empty JSON structure when examples are not requested", () => {
    const plan = buildFilePlan(makeAnswers({ includeExamples: false }));
    for (const locale of ["az", "en", "ru"]) {
      const file = plan.find((f) => f.relativePath === `messages/${locale}.json`)!;
      expect(JSON.parse(file.content)).toEqual({});
    }
  });

  it("produces valid JSON for a custom (unmapped) language code", () => {
    const plan = buildFilePlan(makeAnswers({ locales: ["az", "ka"], includeExamples: true }));
    const ka = JSON.parse(plan.find((f) => f.relativePath === "messages/ka.json")!.content);
    expect(ka.common.hello).toBeTypeOf("string");
  });
});

describe("buildFilePlan — generated code wiring", () => {
  it("provider.tsx imports every selected locale's messages and marks itself a client component", () => {
    const plan = buildFilePlan(makeAnswers({ locales: ["az", "en", "ru"], persist: true }));
    const provider = plan.find((f) => f.relativePath === "provider.tsx")!;
    expect(provider.content).toContain('"use client"');
    expect(provider.content).toContain('import az from "./messages/az.json"');
    expect(provider.content).toContain('import en from "./messages/en.json"');
    expect(provider.content).toContain('import ru from "./messages/ru.json"');
    expect(provider.content).toContain('"az": az');
    expect(provider.content).toContain("persist={true}");
    expect(provider.content).toContain('from "mhlang"');
  });

  it("respects persist=false in the generated provider", () => {
    const plan = buildFilePlan(makeAnswers({ persist: false }));
    const provider = plan.find((f) => f.relativePath === "provider.tsx")!;
    expect(provider.content).toContain("persist={false}");
  });

  it("sanitizes hyphenated locale codes into valid import identifiers without breaking the message key", () => {
    const plan = buildFilePlan(makeAnswers({ locales: ["az", "pt-br"] }));
    const provider = plan.find((f) => f.relativePath === "provider.tsx")!;
    expect(provider.content).toContain('import pt_br from "./messages/pt-br.json"');
    expect(provider.content).toContain('"pt-br": pt_br');
  });

  it("hooks/useTranslation.ts re-exports the base hook bound to the local Locale and message key types", () => {
    const plan = buildFilePlan(makeAnswers({ defaultLocale: "az" }));
    const hook = plan.find((f) => f.relativePath === "hooks/useTranslation.ts")!;
    expect(hook.content).toContain('from "mhlang"');
    expect(hook.content).toContain('import az from "../messages/az.json"');
    expect(hook.content).toContain("type MessageKeys = NestedKeyOf<typeof az>");
    expect(hook.content).toContain("useBaseTranslation<Locale, MessageKeys>()");
  });

  it("utils/translation.ts exposes a type-safe, framework-agnostic getTranslator", () => {
    const plan = buildFilePlan(makeAnswers({ defaultLocale: "en" }));
    const utils = plan.find((f) => f.relativePath === "utils/translation.ts")!;
    expect(utils.content).toContain("export function getTranslator");
    expect(utils.content).toContain('import en from "../messages/en.json"');
    expect(utils.content).toContain("type MessageKeys = NestedKeyOf<typeof en>");
    expect(utils.content).toContain("createTranslator<MessageKeys>(messages[locale], { locale })");
  });
});

describe("buildFilePlan — Next.js-only files", () => {
  it("emits request.ts and an RSC getTranslations() for projectType: nextjs", () => {
    const plan = buildFilePlan(makeAnswers({ projectType: "nextjs" }), "/repo");
    const request = plan.find((f) => f.relativePath === "request.ts")!;
    expect(request.content).toContain("export async function getRequestLocale");
    expect(request.content).toContain('from "next/headers"');

    const utils = plan.find((f) => f.relativePath === "utils/translation.ts")!;
    expect(utils.content).toContain('import { cache } from "react"');
    expect(utils.content).toContain('import { getRequestLocale } from "../request"');
    expect(utils.content).toContain("export async function getTranslations");

    const index = plan.find((f) => f.relativePath === "index.ts")!;
    expect(index.content).toContain('export { getTranslations } from "./utils/translation"');
    expect(index.content).toContain('export { getRequestLocale } from "./request"');
  });

  it("omits request.ts, getTranslations, and the Next.js index exports for projectType: react", () => {
    const plan = buildFilePlan(makeAnswers({ projectType: "react" }), "/repo");
    expect(plan.find((f) => f.relativePath === "request.ts")).toBeUndefined();
    expect(plan.find((f) => f.relativePath === "middleware.ts")).toBeUndefined();

    const utils = plan.find((f) => f.relativePath === "utils/translation.ts")!;
    expect(utils.content).not.toContain("getTranslations");
    expect(utils.content).not.toContain('from "react"');

    const index = plan.find((f) => f.relativePath === "index.ts")!;
    expect(index.content).not.toContain("getTranslations");
  });

  it("only emits the routing file (at the project root) when urlRouting is enabled", () => {
    const withoutRouting = buildFilePlan(makeAnswers({ projectType: "nextjs", urlRouting: false }), "/repo");
    expect(withoutRouting.find((f) => f.relativePath === "proxy.ts")).toBeUndefined();
    expect(withoutRouting.find((f) => f.relativePath === "middleware.ts")).toBeUndefined();

    // No Next.js installed at "/repo" (a fake path) -> defaults to the modern proxy.ts convention.
    const withRouting = buildFilePlan(makeAnswers({ projectType: "nextjs", urlRouting: true }), "/repo");
    const proxy = withRouting.find((f) => f.relativePath === "proxy.ts")!;
    expect(proxy).toBeDefined();
    expect(proxy.absolutePath).toBe(path.join("/repo", "proxy.ts"));
    expect(proxy.content).toContain("export function proxy");
    expect(proxy.content).toContain('from "next/server"');

    // request.ts reads the header the routing file sets, only when urlRouting is on.
    const request = withRouting.find((f) => f.relativePath === "request.ts")!;
    expect(request.content).toContain('headerStore.get("x-mhlang-locale")');
  });

  it("uses the legacy middleware.ts/middleware() convention when Next.js <16 is installed", async () => {
    const projectDir = await mkdtemp(path.join(tmpdir(), "mhlang-next15-"));
    try {
      const nextPkgDir = path.join(projectDir, "node_modules", "next");
      await mkdir(nextPkgDir, { recursive: true });
      await writeFile(path.join(nextPkgDir, "package.json"), JSON.stringify({ version: "15.5.0" }), "utf8");

      const plan = buildFilePlan(makeAnswers({ projectType: "nextjs", urlRouting: true }), projectDir);
      const middleware = plan.find((f) => f.relativePath === "middleware.ts")!;
      expect(middleware).toBeDefined();
      expect(plan.find((f) => f.relativePath === "proxy.ts")).toBeUndefined();
      expect(middleware.content).toContain("export function middleware");
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});

describe("buildFilePlan — provider.tsx / hooks/useTranslation.ts with urlRouting", () => {
  it("gives provider.tsx a `locale` prop wired to initialLocale when urlRouting is on", () => {
    const plan = buildFilePlan(makeAnswers({ urlRouting: true }), "/repo");
    const provider = plan.find((f) => f.relativePath === "provider.tsx")!;
    expect(provider.content).toContain("locale: Locale;");
    expect(provider.content).toContain("initialLocale={locale}");
    expect(provider.content).not.toContain("export interface I18nProviderProps {\n  children: ReactNode;\n}");
  });

  it("does not add a locale prop to provider.tsx when urlRouting is off", () => {
    const plan = buildFilePlan(makeAnswers({ urlRouting: false }), "/repo");
    const provider = plan.find((f) => f.relativePath === "provider.tsx")!;
    expect(provider.content).not.toContain("initialLocale");
  });

  it("wraps setLocale with router navigation in the hook when urlRouting is on", () => {
    const plan = buildFilePlan(makeAnswers({ urlRouting: true }), "/repo");
    const hook = plan.find((f) => f.relativePath === "hooks/useTranslation.ts")!;
    expect(hook.content).toContain('from "next/navigation"');
    expect(hook.content).toContain("router.push(segments.join");
  });

  it("keeps the hook a plain re-export when urlRouting is off", () => {
    const plan = buildFilePlan(makeAnswers({ urlRouting: false }), "/repo");
    const hook = plan.find((f) => f.relativePath === "hooks/useTranslation.ts")!;
    expect(hook.content).not.toContain("next/navigation");
    expect(hook.content).toContain("useBaseTranslation<Locale, MessageKeys>()");
  });
});

describe("buildFilePlan — app/[locale]/layout.tsx", () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(path.join(tmpdir(), "mhlang-layout-"));
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it("generates the layout with correct relative imports when app/ exists", async () => {
    await mkdir(path.join(projectDir, "app"), { recursive: true });

    const plan = buildFilePlan(makeAnswers({ urlRouting: true }), projectDir);
    const layout = plan.find((f) => f.relativePath === "app/[locale]/layout.tsx")!;
    expect(layout).toBeDefined();
    expect(layout.absolutePath).toBe(path.join(projectDir, "app", "[locale]", "layout.tsx"));
    expect(layout.content).toContain('from "../../src/i18n/provider"');
    expect(layout.content).toContain('from "../../src/i18n/config"');
    expect(layout.content).toContain("export function generateStaticParams");
    expect(layout.content).toContain("notFound()");
  });

  it("generates the layout under src/app/ when that's the detected App Router directory", async () => {
    await mkdir(path.join(projectDir, "src", "app"), { recursive: true });

    const plan = buildFilePlan(makeAnswers({ urlRouting: true }), projectDir);
    const layout = plan.find((f) => f.relativePath === "app/[locale]/layout.tsx")!;
    expect(layout.absolutePath).toBe(path.join(projectDir, "src", "app", "[locale]", "layout.tsx"));
    expect(layout.content).toContain('from "../../i18n/provider"');
  });

  it("skips the layout entirely when no app/ or src/app/ directory is found", () => {
    const plan = buildFilePlan(makeAnswers({ urlRouting: true }), projectDir);
    expect(plan.find((f) => f.relativePath === "app/[locale]/layout.tsx")).toBeUndefined();
  });

  it("skips the layout when urlRouting is off, even if app/ exists", async () => {
    await mkdir(path.join(projectDir, "app"), { recursive: true });
    const plan = buildFilePlan(makeAnswers({ urlRouting: false }), projectDir);
    expect(plan.find((f) => f.relativePath === "app/[locale]/layout.tsx")).toBeUndefined();
  });
});
