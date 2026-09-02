import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildFilePlan } from "../../src/cli/generators/plan.js";
import { writeFiles } from "../../src/cli/generators/files.js";
import { removeLanguage } from "../../src/cli/commands/remove-language.js";
import type { InitAnswers } from "../../src/cli/types.js";

const answers: InitAnswers = {
  projectType: "react",
  targetPath: "src/i18n",
  locales: ["az", "en", "ru"],
  defaultLocale: "az",
  includeExamples: true,
  persist: true,
  urlRouting: false,
};

let workDir: string;
let targetDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "mhlang-remove-lang-"));
  targetDir = path.join(workDir, "src", "i18n");
  await writeFiles(targetDir, buildFilePlan(answers, workDir));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("removeLanguage", () => {
  it("deletes the locale's messages file and updates config.ts/provider.tsx", async () => {
    await removeLanguage("ru", { cwd: workDir });

    await expect(access(path.join(targetDir, "messages", "ru.json"))).rejects.toThrow();

    const config = await readFile(path.join(targetDir, "config.ts"), "utf8");
    expect(config).toContain('["az", "en"] as const');
    expect(config).not.toContain("ru");

    const provider = await readFile(path.join(targetDir, "provider.tsx"), "utf8");
    expect(provider).not.toContain("ru.json");
  });

  it("leaves the remaining locales' messages files untouched", async () => {
    const azBefore = await readFile(path.join(targetDir, "messages", "az.json"), "utf8");
    await removeLanguage("ru", { cwd: workDir });
    const azAfter = await readFile(path.join(targetDir, "messages", "az.json"), "utf8");
    expect(azAfter).toBe(azBefore);
  });

  it("refuses to remove the default locale", async () => {
    await expect(removeLanguage("az", { cwd: workDir })).rejects.toThrow(/default locale/);
  });

  it("refuses to remove a locale that isn't configured", async () => {
    await expect(removeLanguage("de", { cwd: workDir })).rejects.toThrow(/not currently configured/);
  });
});
