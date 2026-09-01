import { describe, expect, it } from "vitest";
import { PREDEFINED_LANGUAGES, isValidLanguageCode, normalizeLanguageCode } from "../../src/cli/data/languages.js";
import {
  buildLanguageList,
  resolveDefaultLocale,
  validateCustomLanguageCode,
  validateTargetPath,
} from "../../src/cli/prompts/logic.js";

describe("predefined languages", () => {
  it("includes the languages named in the spec", () => {
    const codes = PREDEFINED_LANGUAGES.map((l) => l.code);
    expect(codes).toEqual(["az", "en", "ru", "tr", "de", "fr", "es"]);
  });

  it("each predefined language has a non-empty display name", () => {
    for (const lang of PREDEFINED_LANGUAGES) {
      expect(lang.name.length).toBeGreaterThan(0);
    }
  });
});

describe("isValidLanguageCode", () => {
  it("accepts simple 2-letter codes", () => {
    expect(isValidLanguageCode("ka")).toBe(true);
  });

  it("accepts region-qualified codes", () => {
    expect(isValidLanguageCode("pt-BR")).toBe(true);
  });

  it("rejects empty or malformed codes", () => {
    expect(isValidLanguageCode("")).toBe(false);
    expect(isValidLanguageCode("1")).toBe(false);
    expect(isValidLanguageCode("toolong-lang")).toBe(false);
  });
});

describe("normalizeLanguageCode", () => {
  it("lowercases and trims", () => {
    expect(normalizeLanguageCode("  KA  ")).toBe("ka");
  });
});

describe("buildLanguageList (custom language addition)", () => {
  it("merges predefined and custom, de-duplicated", () => {
    expect(buildLanguageList(["az", "en"], ["ka"])).toEqual(["az", "en", "ka"]);
  });

  it("normalizes custom codes", () => {
    expect(buildLanguageList(["az"], ["  KA  "])).toEqual(["az", "ka"]);
  });

  it("does not duplicate a custom code that matches a predefined one", () => {
    expect(buildLanguageList(["az", "en"], ["en"])).toEqual(["az", "en"]);
  });

  it("supports the example scenario from the spec: az, en, ru + custom ka", () => {
    expect(buildLanguageList(["az", "en", "ru"], ["ka"])).toEqual(["az", "en", "ru", "ka"]);
  });
});

describe("validateCustomLanguageCode", () => {
  it("rejects empty input", () => {
    expect(validateCustomLanguageCode("", [])).toMatch(/empty/);
    expect(validateCustomLanguageCode(undefined, [])).toMatch(/empty/);
  });

  it("rejects invalid codes", () => {
    expect(validateCustomLanguageCode("123", [])).toBeDefined();
  });

  it("rejects a code that is already selected", () => {
    expect(validateCustomLanguageCode("az", ["az", "en"])).toMatch(/already selected/);
  });

  it("accepts a valid, unused code", () => {
    expect(validateCustomLanguageCode("ka", ["az", "en"])).toBeUndefined();
  });
});

describe("resolveDefaultLocale", () => {
  it("keeps the requested locale when it is in the list", () => {
    expect(resolveDefaultLocale("en", ["az", "en", "ru"])).toBe("en");
  });

  it("falls back to the first locale when the requested one was deselected", () => {
    expect(resolveDefaultLocale("ru", ["az", "en"])).toBe("az");
  });

  it("throws when the locale list is empty", () => {
    expect(() => resolveDefaultLocale("az", [])).toThrow();
  });
});

describe("validateTargetPath", () => {
  it("rejects empty paths", () => {
    expect(validateTargetPath("")).toBeDefined();
    expect(validateTargetPath("   ")).toBeDefined();
  });

  it("rejects absolute paths", () => {
    expect(validateTargetPath("/etc/i18n")).toBeDefined();
    expect(validateTargetPath("C:\\i18n")).toBeDefined();
  });

  it("rejects paths containing '..'", () => {
    expect(validateTargetPath("../outside")).toBeDefined();
  });

  it("accepts a normal relative path", () => {
    expect(validateTargetPath("src/i18n")).toBeUndefined();
    expect(validateTargetPath("src/lib/i18n")).toBeUndefined();
  });
});
