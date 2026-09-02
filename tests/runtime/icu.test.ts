import { describe, expect, it } from "vitest";
import { containsICU, formatICU } from "../../src/runtime/icu.js";
import { createTranslator } from "../../src/runtime/translate.js";

describe("containsICU", () => {
  it("detects plural/select/number/date argument syntax", () => {
    expect(containsICU("{count, plural, one {# item} other {# items}}")).toBe(true);
    expect(containsICU("{gender, select, male {He} other {They}}")).toBe(true);
    expect(containsICU("Total: {price, number}")).toBe(true);
    expect(containsICU("Due {due, date}")).toBe(true);
  });

  it("is false for plain text and {{mustache}} interpolation", () => {
    expect(containsICU("Just text")).toBe(false);
    expect(containsICU("Hello, {{name}}!")).toBe(false);
    expect(containsICU("{name}")).toBe(false);
  });
});

describe("formatICU", () => {
  it("resolves plural with exact =N precedence over category", () => {
    const template = "{count, plural, =0 {No items} one {# item} other {# items}}";
    expect(formatICU(template, { count: 0 }, "en")).toBe("No items");
    expect(formatICU(template, { count: 1 }, "en")).toBe("1 item");
    expect(formatICU(template, { count: 5 }, "en")).toBe("5 items");
  });

  it("resolves select branches with an other fallback", () => {
    const template = "{gender, select, male {He} female {She} other {They}}";
    expect(formatICU(template, { gender: "male" }, "en")).toBe("He");
    expect(formatICU(template, { gender: "nonbinary" }, "en")).toBe("They");
  });

  it("formats number and date arguments via Intl", () => {
    expect(formatICU("{price, number}", { price: 1234.5 }, "en-US")).toBe(
      new Intl.NumberFormat("en-US").format(1234.5)
    );
    const timestamp = Date.UTC(2026, 0, 15);
    expect(formatICU("{due, date}", { due: timestamp }, "en-US")).toBe(
      new Intl.DateTimeFormat("en-US").format(new Date(timestamp))
    );
  });

  it("resolves nested ICU inside a chosen branch, including plain {arg} substitution", () => {
    const template = "{count, plural, other {{count} items for {name}}}";
    expect(formatICU(template, { count: 3, name: "Ali" }, "en")).toBe("3 items for Ali");
  });

  it("leaves plain text untouched", () => {
    expect(formatICU("Just text", {}, "en")).toBe("Just text");
  });
});

describe("createTranslator with ICU messages", () => {
  const messages = {
    cart: {
      items: "{count, plural, one {# item} other {# items}} in your cart",
    },
  };

  it("formats ICU messages end-to-end through t()", () => {
    const t = createTranslator(messages, { locale: "en" });
    expect(t("cart.items", { count: 1 })).toBe("1 item in your cart");
    expect(t("cart.items", { count: 4 })).toBe("4 items in your cart");
  });

  it("still supports plain {{mustache}} messages unaffected by the ICU pass", () => {
    const t = createTranslator({ greet: "Hi, {{name}}!" });
    expect(t("greet", { name: "Aysel" })).toBe("Hi, Aysel!");
  });
});
