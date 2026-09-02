import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildFilePlan } from "../../src/cli/generators/plan.js";
import { writeFiles } from "../../src/cli/generators/files.js";
import { addLanguage } from "../../src/cli/commands/add-language.js";
import type { InitAnswers } from "../../src/cli/types.js";

const answers: InitAnswers = {
  projectType: "react",
  targetPath: "src/i18n",
  locales: ["az", "en"],
  defaultLocale: "az",
  includeExamples: true,
  persist: true,
  urlRouting: false,
};

let workDir: string;
let targetDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "mhlang-add-lang-"));
  targetDir = path.join(workDir, "src", "i18n");
  await writeFiles(targetDir, buildFilePlan(answers, workDir));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("addLanguage", () => {
  it("clones the default locale's key structure into the new locale with blank values", async () => {
    await addLanguage("de", { cwd: workDir });

    const de = JSON.parse(await readFile(path.join(targetDir, "messages", "de.json"), "utf8"));
    const az = JSON.parse(await readFile(path.join(targetDir, "messages", "az.json"), "utf8"));

    expect(Object.keys(de)).toEqual(Object.keys(az));
    expect(de.common.hello).toBe("");
    expect(de.auth.login.title).toBe("");
    // The existing locale's content is left completely untouched.
    expect(az.common.hello).toBe("Salam");
  });

  it("updates config.ts and provider.tsx to include the new locale", async () => {
    await addLanguage("de", { cwd: workDir });

    const config = await readFile(path.join(targetDir, "config.ts"), "utf8");
    expect(config).toContain('["az", "en", "de"] as const');

    const provider = await readFile(path.join(targetDir, "provider.tsx"), "utf8");
    expect(provider).toContain('import de from "./messages/de.json"');
  });

  it("rejects an already-configured locale", async () => {
    await expect(addLanguage("en", { cwd: workDir })).rejects.toThrow(/already configured/);
  });

  it("rejects an invalid language code", async () => {
    await expect(addLanguage("!!!", { cwd: workDir })).rejects.toThrow(/not a valid language code/);
  });

  it("fails with a helpful error when no scaffold exists", async () => {
    const emptyDir = await mkdtemp(path.join(tmpdir(), "mhlang-empty-"));
    try {
      await expect(addLanguage("de", { cwd: emptyDir })).rejects.toThrow(/npx mhlang init/);
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });

  it("replaces a stale legacy middleware.ts with proxy.ts when regenerating a Next.js project", async () => {
    const nextDir = await mkdtemp(path.join(tmpdir(), "mhlang-add-lang-next-"));
    try {
      const nextAnswers: InitAnswers = { ...answers, projectType: "nextjs", urlRouting: true };
      const nextTargetDir = path.join(nextDir, "src", "i18n");
      await writeFiles(nextTargetDir, buildFilePlan(nextAnswers, nextDir));
      // Simulate a leftover from an older mhlang/Next.js version.
      await writeFile(path.join(nextDir, "middleware.ts"), "export function middleware() {}\n", "utf8");

      await addLanguage("de", { cwd: nextDir });

      await expect(access(path.join(nextDir, "middleware.ts"))).rejects.toThrow();
      await expect(access(path.join(nextDir, "proxy.ts"))).resolves.toBeUndefined();
      const proxy = await readFile(path.join(nextDir, "proxy.ts"), "utf8");
      expect(proxy).toContain("export function proxy");
    } finally {
      await rm(nextDir, { recursive: true, force: true });
    }
  });
});
