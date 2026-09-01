import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createTranslator, interpolate, resolveKey } from "../../src/runtime/translate.js";

describe("resolveKey", () => {
  it("resolves a top-level key", () => {
    expect(resolveKey({ hello: "Hi" }, "hello")).toBe("Hi");
  });

  it("resolves nested keys", () => {
    const messages = { auth: { login: { title: "Log in", description: "Enter details" } } };
    expect(resolveKey(messages, "auth.login.title")).toBe("Log in");
    expect(resolveKey(messages, "auth.login.description")).toBe("Enter details");
  });

  it("returns undefined for a missing key", () => {
    expect(resolveKey({ common: { hello: "Hi" } }, "common.missing")).toBeUndefined();
  });

  it("returns undefined when traversing through a non-object", () => {
    expect(resolveKey({ common: "Hi" }, "common.hello")).toBeUndefined();
  });
});

describe("interpolate", () => {
  it("substitutes a single placeholder", () => {
    expect(interpolate("Salam, {{name}}!", { name: "Mehemmed" })).toBe("Salam, Mehemmed!");
  });

  it("substitutes multiple placeholders", () => {
    expect(interpolate("{{a}} + {{b}} = {{c}}", { a: 1, b: 2, c: 3 })).toBe("1 + 2 = 3");
  });

  it("leaves unmatched placeholders untouched", () => {
    expect(interpolate("Hello, {{name}}!", {})).toBe("Hello, {{name}}!");
  });

  it("returns the template unchanged when no params are given", () => {
    expect(interpolate("Just text")).toBe("Just text");
  });
});

describe("createTranslator", () => {
  const messages = {
    common: {
      hello: "Salam",
      helloUser: "Salam, {{name}}!",
    },
    auth: {
      login: {
        title: "Daxil ol",
      },
    },
  };

  it("translates a nested key", () => {
    const t = createTranslator(messages);
    expect(t("auth.login.title")).toBe("Daxil ol");
  });

  it("interpolates params into the resolved string", () => {
    const t = createTranslator(messages);
    expect(t("common.helloUser", { name: "Mehemmed" })).toBe("Salam, Mehemmed!");
  });

  describe("missing translation warning", () => {
    const originalEnv = process.env["NODE_ENV"];

    beforeEach(() => {
      process.env["NODE_ENV"] = "development";
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      process.env["NODE_ENV"] = originalEnv;
    });

    it("warns and returns the key itself when a translation is missing in development", () => {
      const t = createTranslator(messages, { locale: "az" });
      const result = t("common.missing");
      expect(result).toBe("common.missing");
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("common.missing"));
    });

    it("does not warn in production", () => {
      process.env["NODE_ENV"] = "production";
      const t = createTranslator(messages);
      t("common.missing");
      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});
