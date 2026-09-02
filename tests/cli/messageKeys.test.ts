import { describe, expect, it } from "vitest";
import { blankMessages, findMissingKeys, flattenKeys } from "../../src/cli/generators/messageKeys.js";

describe("flattenKeys", () => {
  it("flattens nested keys into dot-paths", () => {
    const messages = { common: { hello: "Salam" }, auth: { login: { title: "Daxil ol" } } };
    expect(flattenKeys(messages).sort()).toEqual(["auth.login.title", "common.hello"]);
  });
});

describe("blankMessages", () => {
  it("preserves structure while blanking every leaf value", () => {
    const messages = { common: { hello: "Salam" }, auth: { login: { title: "Daxil ol" } } };
    expect(blankMessages(messages)).toEqual({ common: { hello: "" }, auth: { login: { title: "" } } });
  });
});

describe("findMissingKeys", () => {
  const reference = { common: { hello: "Hello", welcome: "Welcome" } };

  it("reports a key that is entirely absent", () => {
    const reports = findMissingKeys({ en: reference, de: { common: { hello: "Hallo" } } }, "en");
    expect(reports).toEqual([{ locale: "de", missingKeys: ["common.welcome"] }]);
  });

  it("reports a key that exists but is still blank (the addLanguage placeholder)", () => {
    const reports = findMissingKeys(
      { en: reference, de: { common: { hello: "Hallo", welcome: "" } } },
      "en"
    );
    expect(reports).toEqual([{ locale: "de", missingKeys: ["common.welcome"] }]);
  });

  it("returns no report for a locale that fully matches the reference", () => {
    const reports = findMissingKeys({ en: reference, de: { common: { hello: "Hallo", welcome: "Willkommen" } } }, "en");
    expect(reports).toEqual([]);
  });

  it("skips the reference locale itself", () => {
    const reports = findMissingKeys({ en: reference }, "en");
    expect(reports).toEqual([]);
  });
});
