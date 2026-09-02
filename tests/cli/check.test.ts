import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildFilePlan } from "../../src/cli/generators/plan.js";
import { writeFiles } from "../../src/cli/generators/files.js";
import { check } from "../../src/cli/commands/check.js";
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
let originalExitCode: number | string | undefined | null;

beforeEach(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "mhlang-check-"));
  targetDir = path.join(workDir, "src", "i18n");
  await writeFiles(targetDir, buildFilePlan(answers, workDir));
  originalExitCode = process.exitCode;
  process.exitCode = undefined;
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(async () => {
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
  await rm(workDir, { recursive: true, force: true });
});

describe("check", () => {
  it("passes with exit code 0 when every locale matches the default", async () => {
    await check({ cwd: workDir });
    expect(process.exitCode).toBeUndefined();
  });

  it("reports missing keys and sets a non-zero exit code", async () => {
    await writeFile(path.join(targetDir, "messages", "en.json"), JSON.stringify({ common: {} }), "utf8");

    await check({ cwd: workDir });

    expect(process.exitCode).toBe(1);
    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join("\n");
    expect(output).toContain("en");
    expect(output).toContain("common.hello");
  });

  it("flags a blank placeholder value (as written by addLanguage) as missing too", async () => {
    const en = JSON.parse(await readFile(path.join(targetDir, "messages", "en.json"), "utf8"));
    en.common.hello = "";
    await writeFile(path.join(targetDir, "messages", "en.json"), JSON.stringify(en), "utf8");

    await check({ cwd: workDir });

    expect(process.exitCode).toBe(1);
    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join("\n");
    expect(output).toContain("common.hello");
  });

  it("scopes the report to a single locale via --locale", async () => {
    await writeFile(path.join(targetDir, "messages", "en.json"), JSON.stringify({}), "utf8");

    await check({ cwd: workDir, locale: "en" });

    expect(process.exitCode).toBe(1);
    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat().join("\n");
    expect(output).toContain("en");
  });

  it("fails with a helpful error when no scaffold exists", async () => {
    const emptyDir = await mkdtemp(path.join(tmpdir(), "mhlang-empty-"));
    try {
      await expect(check({ cwd: emptyDir })).rejects.toThrow(/npx mhlang init/);
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });
});
