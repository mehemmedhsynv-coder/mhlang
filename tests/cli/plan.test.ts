import { describe, expect, it } from "vitest";
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

  it("hooks/useTranslation.ts re-exports the base hook bound to the local Locale type", () => {
    const plan = buildFilePlan(makeAnswers());
    const hook = plan.find((f) => f.relativePath === "hooks/useTranslation.ts")!;
    expect(hook.content).toContain('from "mhlang"');
    expect(hook.content).toContain("useBaseTranslation<Locale>()");
  });

  it("utils/translation.ts exposes a framework-agnostic getTranslator", () => {
    const plan = buildFilePlan(makeAnswers());
    const utils = plan.find((f) => f.relativePath === "utils/translation.ts")!;
    expect(utils.content).toContain("export function getTranslator");
    expect(utils.content).toContain("createTranslator");
  });
});
